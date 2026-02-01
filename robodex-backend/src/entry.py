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

async def get_member_clearance(member_id: str, url: str, key: str):
    """Get member clearance level from Supabase"""
    res = await sb_get(
        f"members?member_id=eq.{member_id}&select=clearance",
        url,
        key
    )
    if not res or len(res) == 0:
        return None
    return res[0].get("clearance")

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

async def sb_patch(path, body, url, key):
    """PATCH method for updating Supabase records"""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    res = await pyfetch(
        f"{url}/rest/v1/{path}",
        method="PATCH",
        headers=headers,
        body=json.dumps(body)
    )
    
    if not res.ok:
        error_text = await res.text()
        raise Exception(f"Supabase PATCH error: {res.status} - {error_text}")
    
    return res

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        # CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
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
            GITHUB_TOKEN = self.env.GITHUB_TOKEN if hasattr(self.env, 'GITHUB_TOKEN') else None
            
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

            # ---- CLEARANCE CHECK ----
            clearance = await get_member_clearance(payload["member_id"], SUPABASE_URL, SUPABASE_KEY)

            # ---- ME ENDPOINT ----
            if path == "me" and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                return Response.json({
                    "member_id": payload["member_id"],
                    "name": payload["name"]
                }, headers=cors_headers)

            # ---- INVENTORY ----
            if path == "registry" or path.startswith("registry"):
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                # Parse query string for filters
                query_params = ""
                if "?" in request.url:
                    query_params = "&" + request.url.split("?")[1]
                
                data = await sb_get(
                    f"inventory?select=*{query_params}",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                return Response.json(data, headers=cors_headers)

            # ---- PROJECTS LIST ----
            if path == "projects" and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                data = await sb_get("projects?select=*", SUPABASE_URL, SUPABASE_KEY)
                return Response.json(data, headers=cors_headers)

            # ---- CREATE PROJECT ----
            if path == "projects" and method == "POST":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                
                await sb_post("rpc/create_project", {
                    "p_name": body["name"],
                    "p_pool_id": body["pool_id"]
                }, SUPABASE_URL, SUPABASE_KEY)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- DELETE PROJECT ----
            if path.startswith("projects/") and method == "DELETE":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                project_id = path.split("/")[1]
                
                await sb_post("rpc/delete_project", {
                    "p_project_id": project_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- UPDATE PROJECT (PATCH) ----
            if path.startswith("projects/") and method == "PATCH":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                project_id = path.split("/")[1]
                body = await request.json()
                
                # Update project in Supabase using PATCH
                await sb_patch(
                    f"projects?project_id=eq.{project_id}",
                    body,
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- GET PROJECT ANALYTICS ----
            if path.endswith("/analytics") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                project_id = path.split("/")[1]
                
                data = await sb_post("rpc/get_project_items", {
                    "p_project_id": project_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                return Response.json(result, headers=cors_headers)

            # ---- GET PROJECT DETAILS ----
            if path.startswith("projects/") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                project_id = path.split("/")[1]
                
                # Get project info
                project = await sb_get(
                    f"projects?project_id=eq.{project_id}&select=*",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                
                if not project or len(project) == 0:
                    return Response("Project not found", status=404, headers=cors_headers)
                
                return Response.json(project[0], headers=cors_headers)

            # ---- GITHUB CONTRIBUTORS ----
            if path.startswith("github/") and path.endswith("/contributors") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                repo = path.replace("/contributors", "").split("/", 1)[1]
                
                try:
                    headers = {
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Robodex-App"
                    }
                    if GITHUB_TOKEN:
                        headers["Authorization"] = f"token {GITHUB_TOKEN}"
                    
                    gh_response = await pyfetch(
                        f"https://api.github.com/repos/{repo}/contributors?per_page=10",
                        headers=headers
                    )
                    
                    if not gh_response.ok:
                        error_text = await gh_response.text()
                        return Response.json({
                            "error": "Failed to fetch contributors",
                            "status": gh_response.status,
                            "details": error_text
                        }, status=gh_response.status, headers=cors_headers)
                    
                    data = await gh_response.json()
                    return Response.json(data, headers=cors_headers)
                    
                except Exception as gh_error:
                    return Response.json({
                        "error": "GitHub API error",
                        "details": str(gh_error)
                    }, status=500, headers=cors_headers)

            # ---- GITHUB PULL REQUESTS ----
            if path.startswith("github/") and path.endswith("/pulls") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                repo = path.replace("/pulls", "").split("/", 1)[1]
                
                try:
                    headers = {
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Robodex-App"
                    }
                    if GITHUB_TOKEN:
                        headers["Authorization"] = f"token {GITHUB_TOKEN}"
                    
                    gh_response = await pyfetch(
                        f"https://api.github.com/repos/{repo}/pulls?state=all&per_page=100",
                        headers=headers
                    )
                    
                    if not gh_response.ok:
                        error_text = await gh_response.text()
                        return Response.json({
                            "error": "Failed to fetch pull requests",
                            "status": gh_response.status,
                            "details": error_text
                        }, status=gh_response.status, headers=cors_headers)
                    
                    data = await gh_response.json()
                    return Response.json(data, headers=cors_headers)
                    
                except Exception as gh_error:
                    return Response.json({
                        "error": "GitHub API error",
                        "details": str(gh_error)
                    }, status=500, headers=cors_headers)

            # ---- GITHUB ISSUES (base endpoint, must be last) ----
            if path.startswith("github/") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                # Extract repo (everything after "github/")
                repo = path.split("/", 1)[1]
                
                # Remove any trailing paths that were already handled
                if "/pulls" in repo or "/contributors" in repo:
                    return Response("Not Found", status=404, headers=cors_headers)
                
                try:
                    headers = {
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Robodex-App"
                    }
                    if GITHUB_TOKEN:
                        headers["Authorization"] = f"token {GITHUB_TOKEN}"
                    
                    gh_response = await pyfetch(
                        f"https://api.github.com/repos/{repo}/issues?state=all&per_page=100",
                        headers=headers
                    )
                    
                    if not gh_response.ok:
                        error_text = await gh_response.text()
                        return Response.json({
                            "error": "Failed to fetch GitHub issues",
                            "status": gh_response.status,
                            "details": error_text
                        }, status=gh_response.status, headers=cors_headers)
                    
                    issues = await gh_response.json()
                    return Response.json(issues, headers=cors_headers)
                    
                except Exception as gh_error:
                    return Response.json({
                        "error": "GitHub API error",
                        "details": str(gh_error)
                    }, status=500, headers=cors_headers)

            # ---- ISSUE ITEMS ----
            if path == "issue" and method == "POST":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                await sb_post("rpc/issue_items", {
                    "p_member_id": payload["member_id"],
                    "p_project_id": body["project_id"],
                    "p_items": body["items"],
                    "p_return_date": body.get("return_date")
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)
            
            # ---- MY ISSUES ----
            if path == "my-issues" and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                data = await sb_get(
                    f"issues?member_id=eq.{payload['member_id']}&select=*",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                return Response.json(data, headers=cors_headers)

            # ---- FULL RETURN ----
            if path == "full" and method == "POST":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                await sb_post("rpc/return_issue", {
                    "p_issue_id": body["issue_id"]
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)

            # ---- PARTIAL RETURN ----
            if path == "partial" and method == "POST":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                await sb_post("rpc/return_items", {
                    "p_issue_id": body["issue_id"],
                    "p_items": body["items"]
                }, SUPABASE_URL, SUPABASE_KEY)
                return Response.json({"success": True}, headers=cors_headers)
            
            if path == "members/batch" and method == "POST":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                member_ids = body.get("member_ids", [])
                
                data = await sb_post("rpc/get_members_by_ids", {
                    "p_member_ids": member_ids
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                return Response.json(result, headers=cors_headers)

            if path == "members" and method == "GET":
                data = await sb_get("members?select=*", SUPABASE_URL, SUPABASE_KEY)
                return Response.json(data, headers=cors_headers)

            # ---- GET POOL DETAILS ----
            if path.startswith("pool/") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                pool_id = path.split("/")[1]
                
                data = await sb_post("rpc/get_pool_details", {
                    "p_pool_id": pool_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if result is None:
                    return Response("Pool not found", status=404, headers=cors_headers)
                
                return Response.json(result, headers=cors_headers)

            # ---- GET ALL POOLS ----
            if path == "pools" and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                data = await sb_get("pool?select=*", SUPABASE_URL, SUPABASE_KEY)
                return Response.json(data, headers=cors_headers)

            # ---- CREATE POOL ----
            if path == "pool" and method == "POST":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                
                await sb_post("pool", {
                    "name": body["name"],
                    "description": body.get("description", ""),
                    "managers": body.get("managers", [])
                }, SUPABASE_URL, SUPABASE_KEY)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- UPDATE POOL ----
            if path.startswith("pool/") and method == "PATCH":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                pool_id = path.split("/")[1]
                body = await request.json()
                
                # Build update query
                update_data = {}
                if "name" in body:
                    update_data["name"] = body["name"]
                if "description" in body:
                    update_data["description"] = body["description"]
                if "managers" in body:
                    update_data["managers"] = body["managers"]
                
                await sb_post(f"pool?pool_id=eq.{pool_id}", update_data, SUPABASE_URL, SUPABASE_KEY)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- DELETE POOL ----
            if path.startswith("pool/") and method == "DELETE":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                pool_id = path.split("/")[1]
                
                res = await pyfetch(
                    f"{SUPABASE_URL}/rest/v1/pool?pool_id=eq.{pool_id}",
                    method="DELETE",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json"
                    }
                )
                
                if not res.ok:
                    return Response("Failed to delete pool", status=500, headers=cors_headers)
                
                return Response.json({"success": True}, headers=cors_headers)
            
            # ---- UPDATE PASSWORD ----
            if path == "update-password" and method == "POST":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                
                # Verify current password
                login_res = await sb_get(
                    f"members?name=eq.{payload['name']}&password=eq.{body['current_password']}&select=member_id,name",
                    SUPABASE_URL,
                    SUPABASE_KEY
                )
                
                if not login_res:
                    return Response("Current password is incorrect", status=401, headers=cors_headers)
                
                # Update password
                await sb_post("rpc/update_member_password", {
                    "p_member_id": payload["member_id"],
                    "p_new_password": body["new_password"]
                }, SUPABASE_URL, SUPABASE_KEY)
                
                # Generate new JWT
                new_token = sign_jwt(login_res[0], JWT_SECRET)
                
                return Response.json({
                    "success": True,
                    "token": new_token
                }, headers=cors_headers)
            
            # ---- GET ALL EVENTS ----
            if path == "events" and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                data = await sb_post("rpc/get_events", {}, SUPABASE_URL, SUPABASE_KEY)
                result = await data.json()
                return Response.json(result if result else [], headers=cors_headers)

            # ---- GET SINGLE EVENT ----
            if path.startswith("events/") and method == "GET":
                if clearance is None or clearance < 0:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                event_id = path.split("/")[1]
                
                data = await sb_post("rpc/get_event", {
                    "p_event_id": event_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if result is None:
                    return Response("Event not found", status=404, headers=cors_headers)
                
                return Response.json(result, headers=cors_headers)

            # ---- CREATE EVENT ----
            if path == "events" and method == "POST":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                
                data = await sb_post("rpc/create_event", {
                    "p_name": body["event_name"],
                    "p_description": body.get("event_description", ""),
                    "p_datetime": body["event_datetime"],
                    "p_project_id": body.get("project_id"),
                    "p_tags": body.get("tags")
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                return Response.json(result, headers=cors_headers)

            # ---- UPDATE EVENT ----
            if path.startswith("events/") and method == "PATCH":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                event_id = path.split("/")[1]
                body = await request.json()
                
                data = await sb_post("rpc/update_event", {
                    "p_event_id": event_id,
                    "p_updates": body
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if result is None:
                    return Response("Event not found", status=404, headers=cors_headers)
                
                return Response.json(result, headers=cors_headers)

            # ---- DELETE EVENT ----
            if path.startswith("events/") and method == "DELETE":
                if clearance is None or clearance < 5:
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                event_id = path.split("/")[1]
                
                data = await sb_post("rpc/delete_event", {
                    "p_event_id": event_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if not result:
                    return Response("Event not found", status=404, headers=cors_headers)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- GET ALL KANBAN COLUMNS ----
            if path == "kanban" and method == "GET":
                if (clearance is None) or (clearance < 0):
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                data = await sb_post("rpc/get_all_kanban", {}, SUPABASE_URL, SUPABASE_KEY)
                result = await data.json()
                return Response.json(result if result else [], headers=cors_headers)

            # ---- GET SINGLE KANBAN COLUMN ----
            if path.startswith("kanban/") and method == "GET":
                if (clearance is None) or (clearance < 0):
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                column_id = path.split("/")[1]
                
                data = await sb_post("rpc/get_kanban_by_id", {
                    "target_id": column_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if not result or len(result) == 0:
                    return Response("Kanban column not found", status=404, headers=cors_headers)
                
                return Response.json(result[0], headers=cors_headers)

            # ---- CREATE/UPDATE KANBAN COLUMN (UPSERT) ----
            if path == "kanban" and method == "POST":
                if (clearance is None) or (clearance < 5):
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                body = await request.json()
                
                data = await sb_post("rpc/upsert_kanban", {
                    "payload": body
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if not result or len(result) == 0:
                    return Response("Failed to upsert kanban column", status=500, headers=cors_headers)
                
                return Response.json(result[0], headers=cors_headers)

            # ---- UPDATE KANBAN COLUMN (UPSERT with column_id) ----
            if path.startswith("kanban/") and method == "PATCH":
                if (clearance is None) or (clearance < 5):
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                column_id = path.split("/")[1]
                body = await request.json()
                
                # Add column_id to the payload for upsert
                body["column_id"] = column_id
                
                data = await sb_post("rpc/upsert_kanban", {
                    "payload": body
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if not result or len(result) == 0:
                    return Response("Kanban column not found", status=404, headers=cors_headers)
                
                return Response.json(result[0], headers=cors_headers)

            # ---- DELETE KANBAN COLUMN ----
            if path.startswith("kanban/") and method == "DELETE":
                if (clearance is None) or (clearance < 5):
                    return Response("Unauthorized: Insufficient clearance", status=401, headers=cors_headers)
                
                column_id = path.split("/")[1]
                
                data = await sb_post("rpc/delete_kanban", {
                    "target_id": column_id
                }, SUPABASE_URL, SUPABASE_KEY)
                
                result = await data.json()
                
                if result != "Success":
                    return Response("Failed to delete kanban column", status=500, headers=cors_headers)
                
                return Response.json({"success": True}, headers=cors_headers)

            # ---- DEBUG ENDPOINT ----
            if path == "debug" and method == "GET":
                return Response.json({
                    "full_url": request.url,
                    "path": path,
                    "method": method,
                    "has_payload": payload is not None,
                    "has_github_token": GITHUB_TOKEN is not None
                }, headers=cors_headers)

            # 404 with debug info
            return Response.json({
                "error": "Not Found",
                "debug": {
                    "path": path,
                    "method": method,
                    "url": request.url
                }
            }, status=404, headers=cors_headers)

        except Exception as e:
            # Log the full error for debugging
            import traceback
            error_details = traceback.format_exc()
            print(f"Error: {error_details}")
            
            # Return error with CORS headers
            return Response.json({
                "error": str(e),
                "type": type(e).__name__
            }, status=500, headers=cors_headers)