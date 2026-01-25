# RoboDex Backend

The RoboDex backend is a **Python Cloudflare Worker** that provides a RESTful API for the frontend. It handles authentication, inventory management, issue tracking, and integrations with external services.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Workers                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    entry.py                         │ │
│  │                                                     │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │ │
│  │  │  Auth   │  │  CORS   │  │ Router  │           │ │
│  │  │Middleware│ │ Handler │  │         │           │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘           │ │
│  │       │            │            │                 │ │
│  │       ▼            ▼            ▼                 │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │              Route Handlers                  │ │ │
│  │  │  /login  /registry  /issues  /projects ...  │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐      ┌─────────┐
    │Supabase │       │ GitHub  │      │   JWT   │
    │ (DB)    │       │  API    │      │ Library │
    └─────────┘       └─────────┘      └─────────┘
```

## 📁 Directory Structure

```
robodex-backend/
├── src/
│   └── entry.py          # Main worker code - all API logic
│
├── wrangler.jsonc        # Cloudflare Workers configuration
├── pyproject.toml        # Python dependencies
├── package.json          # npm scripts for deployment
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for type hints and local dev)
- A Cloudflare account
- A Supabase project

### Installation

```bash
# Install wrangler and dependencies
npm install

# Set up Python virtual environment (for IDE support)
uv venv
uv sync
```

### Configuration

Create or edit `wrangler.jsonc` with your secrets:

```jsonc
{
  "name": "robodex-backend",
  "main": "src/entry.py",
  "compatibility_date": "2024-01-01",
  "vars": {
    // Public vars go here
  }
}
```

**Secrets** (use `wrangler secret put <NAME>`):

| Secret | Description | Required |
|--------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `JWT_SECRET` | Secret for signing JWTs | ✅ |
| `GITHUB_TOKEN` | GitHub personal access token | ❌ |

```bash
# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_TOKEN  # Optional
```

### Running Locally

```bash
npm run dev
# or
wrangler dev
```

The API will be available at `http://localhost:8787`

### Deploying

```bash
npm run deploy
# or
wrangler deploy
```

## 🔌 API Endpoints

### Authentication

#### `POST /login`
Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "name": "John Doe",
  "password": "secret123"
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "member": {
    "member_id": "uuid",
    "name": "John Doe"
  }
}
```

#### `GET /me`
Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "member_id": "uuid",
  "name": "John Doe"
}
```

#### `POST /update-password`
Change the current user's password.

**Request:**
```json
{
  "current_password": "old123",
  "new_password": "new456"
}
```

---

### Inventory

#### `GET /registry`
List all inventory items.

**Query Parameters:**
- `item_no=eq.<id>` - Filter by item number

**Response:**
```json
[
  {
    "item_no": "ITEM001",
    "name": "Arduino Uno",
    "quantity": 10,
    "available": 7,
    "price": "25.00",
    "location": "Shelf A1",
    "resources": "https://arduino.cc"
  }
]
```

---

### Issues

#### `POST /issue`
Issue items to a project.

**Request:**
```json
{
  "project_id": "uuid",
  "items": [
    { "item_no": "ITEM001", "quantity": 2 },
    { "item_no": "ITEM002", "quantity": 1 }
  ],
  "return_date": "2024-12-31"  // Optional
}
```

#### `GET /my-issues`
Get all issues for the current user.

**Response:**
```json
[
  {
    "issue_id": "uuid",
    "item_no": "ITEM001",
    "item_name": "Arduino Uno",
    "quantity": 2,
    "issue_date": "2024-01-15",
    "expected_return_date": "2024-12-31",
    "returned": false,
    "returned_quantity": 0,
    "project_id": "uuid",
    "project_name": "Robot Arm"
  }
]
```

#### `POST /full`
Return all items from an issue.

**Request:**
```json
{
  "issue_id": "uuid"
}
```

#### `POST /partial`
Return a partial quantity from an issue.

**Request:**
```json
{
  "issue_id": "uuid",
  "quantity": 1
}
```

---

### Projects

#### `GET /projects`
List all projects.

#### `GET /projects/:project_id`
Get a single project.

#### `PATCH /projects/:project_id`
Update a project.

**Request:**
```json
{
  "project_name": "Updated Name",
  "description": "New description",
  "github_repo": "owner/repo",
  "notion_page_id": "https://notion.so/..."
}
```

#### `GET /projects/:project_id/analytics`
Get items issued to a project.

**Response:**
```json
[
  {
    "item_no": "ITEM001",
    "item_name": "Arduino Uno",
    "total_quantity": 5,
    "price": "25.00"
  }
]
```

---

### Members

#### `POST /members/batch`
Get multiple members by their IDs.

**Request:**
```json
{
  "member_ids": ["uuid1", "uuid2"]
}
```

---

### Pools

#### `GET /pools`
List all pools.

#### `GET /pool/:pool_id`
Get pool details with managers.

#### `POST /pool`
Create a new pool.

#### `PATCH /pool/:pool_id`
Update a pool.

#### `DELETE /pool/:pool_id`
Delete a pool.

---

### GitHub Integration

#### `GET /github/:owner/:repo`
Get repository issues.

#### `GET /github/:owner/:repo/pulls`
Get pull requests.

#### `GET /github/:owner/:repo/contributors`
Get contributor statistics.

---

## 🔐 Authentication Implementation

### JWT Flow

```python
# Token creation (login)
token = jwt.encode({
    "member_id": member["member_id"],
    "name": member["name"],
    "exp": datetime.utcnow() + timedelta(days=7)
}, JWT_SECRET, algorithm="HS256")

# Token verification (middleware)
def get_current_user(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload
```

### Protected Routes

All routes except `/login` require authentication:

```python
# Check auth on every request
if request.path != "/login":
    user = get_current_user(request)
    if not user:
        return Response(status=401)
```

## 🗄️ Database Interactions

### Supabase Client Setup

```python
from supabase import create_client

supabase = create_client(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
)
```

### Common Patterns

```python
# Select all
items = supabase.table("inventory").select("*").execute()

# Select with filter
item = supabase.table("inventory").select("*").eq("item_no", "ITEM001").execute()

# Insert
supabase.table("issues").insert({
    "item_no": "ITEM001",
    "quantity": 2,
    "member_id": user["member_id"]
}).execute()

# Update
supabase.table("projects").update({
    "project_name": "New Name"
}).eq("project_id", project_id).execute()

# RPC (stored functions)
result = supabase.rpc("issue_items", {
    "p_member_id": member_id,
    "p_project_id": project_id,
    "p_items": items,
    "p_return_date": return_date
}).execute()
```

## 🌐 CORS Configuration

CORS is handled for all requests:

```python
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Handle preflight
if request.method == "OPTIONS":
    return add_cors_headers(Response(status=204))
```

## 🔧 Development Tips

### Type Hints

Set up your IDE to use the virtual environment:

```bash
uv venv
uv sync
# Point your IDE's Python interpreter to .venv/bin/python
```

### Debugging

Use `print()` statements - they appear in `wrangler dev` output:

```python
print(f"Request: {request.method} {request.path}")
print(f"User: {user}")
```

### Testing Endpoints

```bash
# Login
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"name":"John","password":"secret"}'

# Authenticated request
curl http://localhost:8787/registry \
  -H "Authorization: Bearer <token>"
```

## 📝 Adding New Endpoints

1. Add route handler in `entry.py`:

```python
@app.route("/new-endpoint", methods=["GET"])
def new_endpoint(request):
    user = get_current_user(request)
    # Your logic here
    return Response.json({"data": "value"})
```

2. Add any required database tables/functions in `supabase.sql`

3. Document the endpoint in this README and `docs/API.md`

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check `Access-Control-Allow-Origin` header |
| 401 Unauthorized | Verify token is valid and not expired |
| Supabase errors | Check URL and service key are correct |
| GitHub rate limit | Add `GITHUB_TOKEN` secret |

## 📚 Resources

- [Cloudflare Workers Python Docs](https://developers.cloudflare.com/workers/languages/python/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)

---

For more information, see the [main README](../README.md) or [API documentation](../docs/API.md).
