import json, time, base64, hmac, hashlib
from workers import Response, WorkerEntrypoint
from pyodide.http import pyfetch

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def sign_jwt(payload: dict, secret: str, exp_seconds=3600):
    payload["exp"] = int(time.time()) + exp_seconds
    header = {"alg": "HS256", "typ": "JWT"}

    h = b64url(json.dumps(header).encode())
    p = b64url(json.dumps(payload).encode())

    sig = hmac.new(
        secret.encode(),
        f"{h}.{p}".encode(),
        hashlib.sha256
    ).digest()

    return f"{h}.{p}.{b64url(sig)}"

def verify_jwt(token: str, secret: str):
    try:
        h, p, s = token.split(".")
    except ValueError:
        return None

    sig = hmac.new(
        secret.encode(),
        f"{h}.{p}".encode(),
        hashlib.sha256
    ).digest()

    if b64url(sig) != s:
        return None

    payload = json.loads(base64.urlsafe_b64decode(p + "=="))
    if payload["exp"] < time.time():
        return None

    return payload

def auth_payload(request, secret: str):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return verify_jwt(auth[7:], secret)

async def sb_get(path, url, key):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    res = await pyfetch(f"{url}/rest/v1/{path}", headers=headers)
    return await res.json()

async def sb_post(path, body, url, key):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    res = await pyfetch(
        f"{url}/rest/v1/{path}",
        method="POST",
        headers=headers,
        body=json.dumps(body)
    )
    
    if not res.ok:
        error_text = await res.text()
        raise Exception(f"Supabase error: {res.status} - {error_text}")
    
    return res

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        # CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

        # Handle OPTIONS preflight request
        if request.method == "OPTIONS":
            return Response("", status=204, headers=cors_headers)

        try:
            # Access environment variables
            SUPABASE_URL = self.env.SUPABASE_URL
            SUPABASE_KEY = self.env.SUPABASE_SERVICE_KEY
            JWT_SECRET = self.env.JWT_SECRET
            
            path = request.url.split("/")[-1]
            method = request.method

            # ---- LOGIN ----
            if path == "login" and method == "POST":
                body = await request.json()

                res = await sb_get(
                    f"members?name=eq.{body['name']}&password=eq.{body['password']}&select=member_id,name",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )

                if not res:
                    return Response("Unauthorized", status=401, headers=cors_headers)

                token = sign_jwt(res[0], JWT_SECRET)
                return Response.json({"token": token}, headers=cors_headers)

            # ---- AUTH REQUIRED BELOW ----
            payload = auth_payload(request, JWT_SECRET)
            if not payload:
                return Response("Unauthorized", status=401, headers=cors_headers)

            # ---- INVENTORY ----
            if path == "registry" and method == "GET":
                data = await sb_get("inventory?select=*", SUPABASE_URL, SUPABASE_KEY)
                return Response.json(data, headers=cors_headers)

            # ---- PROJECTS ----
            if path == "projects" and method == "GET":
                data = await sb_get("projects?select=*", SUPABASE_URL, SUPABASE_KEY)
                return Response.json(data, headers=cors_headers)

            # ---- ISSUE ----
            if path == "issue" and method == "POST":
                body = await request.json()
                await sb_post("rpc/issue_items", {
                    "p_member_id": payload["member_id"],
                    "p_project_id": body["project_id"],
                    "p_items": body["items"],
                    "p_return_date": body.get("return_date")
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)

            # ---- FULL RETURN ----
            if path == "full" and method == "POST":
                body = await request.json()
                await sb_post("rpc/return_issue", {
                    "p_issue_id": body["issue_id"]
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)

            # ---- PARTIAL RETURN ----
            if path == "partial" and method == "POST":
                body = await request.json()
                await sb_post("rpc/return_items", {
                    "p_issue_id": body["issue_id"],
                    "p_items": body["items"]
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)

            return Response("Not Found", status=404, headers=cors_headers)

        except Exception as e:
            # Always return CORS headers even on error
            return Response(f"Error: {str(e)}", status=500, headers=cors_headers)