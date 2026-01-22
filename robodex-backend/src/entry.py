import json, time, base64, hmac, hashlib
from workers import Response, WorkerEntrypoint
from pyodide.http import pyfetch
from urllib.parse import urlparse

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
            
            parsed_url = urlparse(request.url)
            path = parsed_url.path.lstrip("/")
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

            # ---- GET REGISTRY (with optional filter) ----
            if path.startswith("registry") and method == "GET":
                # Parse query string for filters
                query_params = ""
                if "?" in request.url:
                    query_params = "?" + request.url.split("?")[1]
                
                data = await sb_get(
                    f"inventory{query_params}&select=*",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
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
            
            #---- ISSUES ----
            if path == "my-issues" and method == "GET":
                data = await sb_get(
                    f"issues?member_id=eq.{payload['member_id']}&select=*",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                return Response.json(data, headers=cors_headers)

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
            
            # ---- UPDATE PASSWORD ----
            if path == "update-password" and method == "POST":
                body = await request.json()
                
                # Verify current password by attempting login
                login_res = await sb_get(
                    f"members?name=eq.{payload['name']}&password=eq.{body['current_password']}&select=member_id,name",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                
                if not login_res:
                    return Response("Current password is incorrect", status=401, headers=cors_headers)
                
                # Current password is correct, update to new password using RPC
                await sb_post("rpc/update_member_password", {
                    "p_member_id": payload["member_id"],
                    "p_new_password": body["new_password"]
                }, SUPABASE_URL, SUPABASE_KEY)
                
                # Generate new JWT with updated credentials
                new_token = sign_jwt(login_res[0], JWT_SECRET)
                
                return Response.json({
                    "success": True,
                    "token": new_token
                }, headers=cors_headers)
            
            # ---- GET PROJECT DETAILS ----
            if path.startswith("projects/") and not path.endswith("/analytics") and method == "GET":
                project_id = path.split("/")[1]
                print("Fetching project details for:", project_id)
                # Get project info
                project = await sb_get(
                    f"projects?project_id=eq.{project_id}&select=*",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                
                if not project or len(project) == 0:
                    return Response("Project not found", status=404, headers=cors_headers)
                
                return Response.json(project[0], headers=cors_headers)

            # ---- GET PROJECT ANALYTICS ----
            if path.endswith("/analytics") and method == "GET":
                project_id = path.split("/")[1]
                
                data = await sb_post("rpc/get_project_items", {
                    "p_project_id": project_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                return Response.json(result, headers=cors_headers)
            
            # ---- GET GITHUB ISSUES ----
            if path.startswith("github/") and method == "GET":
                repo = path.split("/", 1)[1]  # e.g., "owner/repo"
                
                gh_response = await pyfetch(
                    f"https://api.github.com/repos/{repo}/issues?state=open",
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Robodex-App"
                    }
                )
                
                if not gh_response.ok:
                    return Response("Failed to fetch GitHub data", status=500, headers=cors_headers)
                
                issues = await gh_response.json()
                return Response.json(issues, headers=cors_headers)
            
            if path == "me" and method == "GET":
                # payload already contains member_id and name from the JWT
                return Response.json({
                    "member_id": payload["member_id"],
                    "name": payload["name"]
                }, headers=cors_headers)

            if path == "debug" and method == "GET":
                return Response.json({
                    "full_url": request.url,
                    "path": path,
                    "method": method,
                    "has_payload": payload is not None
                }, headers=cors_headers)

            # Also modify the 404 to show debug info
            return Response.json({
                "error": "Not Found",
                "debug": {
                    "path": path,
                    "method": method,
                    "url": request.url
                }
            }, status=404, headers=cors_headers)

            #return Response("Not Found", status=404, headers=cors_headers)

        except Exception as e:
            # Always return CORS headers even on error
            return Response(f"Error: {str(e)}", status=500, headers=cors_headers)