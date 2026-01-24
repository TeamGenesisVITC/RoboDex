# API Reference

Complete API documentation for the RoboDex backend.

**Base URL:** `https://your-worker.workers.dev` (production) or `http://localhost:8787` (local)

**Authentication:** Most endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Table of Contents

- [Authentication](#authentication)
- [Inventory](#inventory)
- [Issues](#issues)
- [Projects](#projects)
- [Members](#members)
- [Pools](#pools)
- [GitHub Integration](#github-integration)

---

## Authentication

### Login

Authenticate a user and receive a JWT token.

```http
POST /login
```

**Request Body:**
```json
{
  "name": "John Doe",
  "password": "mypassword"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "member_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Get Current User

Get information about the authenticated user.

```http
GET /me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "member_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe"
}
```

---

### Update Password

Change the authenticated user's password.

```http
POST /update-password
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbG..."
}
```

**Error Response (400):**
```json
{
  "error": "Current password is incorrect"
}
```

---

## Inventory

### List Inventory Items

Get all items in the inventory.

```http
GET /registry
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `item_no` | string | Filter by item number (e.g., `item_no=eq.ITEM001`) |

**Success Response (200):**
```json
[
  {
    "item_no": "ITEM001",
    "name": "Arduino Uno R3",
    "quantity": 10,
    "available": 7,
    "price": "25.99",
    "location": "Shelf A1",
    "resources": "https://www.arduino.cc/en/Main/ArduinoBoardUno"
  },
  {
    "item_no": "ITEM002",
    "name": "Raspberry Pi 4",
    "quantity": 5,
    "available": 3,
    "price": "55.00",
    "location": "Shelf B2",
    "resources": null
  }
]
```

### Get Single Item

Get a specific item by item number.

```http
GET /registry?item_no=eq.ITEM001
```

**Success Response (200):**
```json
[
  {
    "item_no": "ITEM001",
    "name": "Arduino Uno R3",
    "quantity": 10,
    "available": 7,
    "price": "25.99",
    "location": "Shelf A1",
    "resources": "https://www.arduino.cc/en/Main/ArduinoBoardUno"
  }
]
```

---

## Issues

### Issue Items

Issue one or more items to a project.

```http
POST /issue
```

**Request Body:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "item_no": "ITEM001",
      "quantity": 2
    },
    {
      "item_no": "ITEM002",
      "quantity": 1
    }
  ],
  "return_date": "2024-12-31"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | UUID | Yes | Target project ID |
| `items` | array | Yes | Items to issue |
| `items[].item_no` | string | Yes | Item identifier |
| `items[].quantity` | integer | Yes | Quantity to issue |
| `return_date` | date | No | Expected return date (YYYY-MM-DD) |

**Success Response (200):**
```json
{
  "success": true,
  "issue_ids": ["uuid1", "uuid2"]
}
```

**Error Response (400):**
```json
{
  "error": "Insufficient quantity available for ITEM001"
}
```

---

### Get My Issues

Get all issues for the authenticated user.

```http
GET /my-issues
```

**Success Response (200):**
```json
[
  {
    "issue_id": "550e8400-e29b-41d4-a716-446655440001",
    "item_no": "ITEM001",
    "item_name": "Arduino Uno R3",
    "quantity": 2,
    "issue_date": "2024-01-15T10:30:00Z",
    "expected_return_date": "2024-12-31",
    "returned": false,
    "returned_quantity": 0,
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Robot Arm Project"
  }
]
```

---

### Full Return

Return all items from an issue.

```http
POST /full
```

**Request Body:**
```json
{
  "issue_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "returned_quantity": 2
}
```

---

### Partial Return

Return a partial quantity from an issue.

```http
POST /partial
```

**Request Body:**
```json
{
  "issue_id": "550e8400-e29b-41d4-a716-446655440001",
  "quantity": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "returned_quantity": 1,
  "remaining_quantity": 1
}
```

**Error Response (400):**
```json
{
  "error": "Cannot return more than issued quantity"
}
```

---

## Projects

### List Projects

Get all projects.

```http
GET /projects
```

**Success Response (200):**
```json
[
  {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Robot Arm Project",
    "description": "Building a 6-axis robot arm",
    "notion_page_id": "https://notion.so/...",
    "github_repo": "team-genesis/robot-arm",
    "pool": "pool-uuid",
    "members": ["member-uuid-1", "member-uuid-2"],
    "managers": ["member-uuid-1"]
  }
]
```

---

### Get Project

Get a single project by ID.

```http
GET /projects/:project_id
```

**Success Response (200):**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_name": "Robot Arm Project",
  "description": "Building a 6-axis robot arm",
  "notion_page_id": "https://notion.so/...",
  "github_repo": "team-genesis/robot-arm",
  "doc_urls": [
    {
      "name": "Design Document",
      "url": "https://docs.google.com/..."
    }
  ],
  "pool": "pool-uuid",
  "members": ["member-uuid-1", "member-uuid-2"],
  "managers": ["member-uuid-1"]
}
```

---

### Update Project

Update project settings.

```http
PATCH /projects/:project_id
```

**Request Body:**
```json
{
  "project_name": "Updated Project Name",
  "description": "New description",
  "github_repo": "team-genesis/new-repo",
  "notion_page_id": "https://notion.so/new-page",
  "doc_urls": [
    {
      "name": "New Doc",
      "url": "https://example.com"
    }
  ],
  "members": ["uuid1", "uuid2"],
  "managers": ["uuid1"]
}
```

All fields are optional - only include fields you want to update.

**Success Response (200):**
```json
{
  "success": true
}
```

---

### Get Project Analytics

Get items issued to a project.

```http
GET /projects/:project_id/analytics
```

**Success Response (200):**
```json
[
  {
    "item_no": "ITEM001",
    "item_name": "Arduino Uno R3",
    "total_quantity": 5,
    "price": "25.99"
  },
  {
    "item_no": "ITEM002",
    "item_name": "Raspberry Pi 4",
    "total_quantity": 2,
    "price": "55.00"
  }
]
```

---

## Members

### Batch Get Members

Get multiple members by their IDs.

```http
POST /members/batch
```

**Request Body:**
```json
{
  "member_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Success Response (200):**
```json
[
  {
    "member_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "phone": "555-0123",
    "email": "john@example.com"
  },
  {
    "member_id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Jane Smith",
    "phone": "555-0456",
    "email": "jane@example.com"
  }
]
```

---

## Pools

### List Pools

Get all pools.

```http
GET /pools
```

**Success Response (200):**
```json
[
  {
    "pool_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Electronics Pool",
    "description": "Pool for electronics projects"
  }
]
```

---

### Get Pool

Get a pool with its managers.

```http
GET /pool/:pool_id
```

**Success Response (200):**
```json
{
  "pool_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Electronics Pool",
  "description": "Pool for electronics projects",
  "managers": [
    {
      "member_id": "uuid",
      "name": "John Doe"
    }
  ]
}
```

---

### Create Pool

Create a new pool.

```http
POST /pool
```

**Request Body:**
```json
{
  "name": "New Pool",
  "description": "Description of the pool",
  "manager_ids": ["member-uuid-1"]
}
```

**Success Response (201):**
```json
{
  "pool_id": "new-uuid",
  "success": true
}
```

---

### Update Pool

Update a pool.

```http
PATCH /pool/:pool_id
```

**Request Body:**
```json
{
  "name": "Updated Pool Name",
  "description": "Updated description"
}
```

---

### Delete Pool

Delete a pool.

```http
DELETE /pool/:pool_id
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

## GitHub Integration

### Get Repository Issues

Fetch issues from a GitHub repository.

```http
GET /github/:owner/:repo
```

**Example:**
```http
GET /github/team-genesis/robot-arm
```

**Success Response (200):**
```json
[
  {
    "id": 12345,
    "title": "Bug in motor control",
    "html_url": "https://github.com/team-genesis/robot-arm/issues/1",
    "state": "open",
    "created_at": "2024-01-15T10:30:00Z",
    "assignee": {
      "login": "johndoe",
      "avatar_url": "https://github.com/johndoe.png"
    },
    "assignees": [
      {
        "login": "johndoe"
      }
    ]
  }
]
```

---

### Get Pull Requests

Fetch pull requests from a GitHub repository.

```http
GET /github/:owner/:repo/pulls
```

**Success Response (200):**
```json
[
  {
    "id": 67890,
    "title": "Add new feature",
    "html_url": "https://github.com/team-genesis/robot-arm/pull/5",
    "state": "open",
    "merged_at": null,
    "user": {
      "login": "janesmith"
    }
  }
]
```

---

### Get Contributors

Fetch contributor statistics from a GitHub repository.

```http
GET /github/:owner/:repo/contributors
```

**Success Response (200):**
```json
[
  {
    "login": "johndoe",
    "contributions": 150,
    "avatar_url": "https://github.com/johndoe.png"
  },
  {
    "login": "janesmith",
    "contributions": 120,
    "avatar_url": "https://github.com/janesmith.png"
  }
]
```

---

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

- **GitHub endpoints**: Subject to GitHub API rate limits
  - Without `GITHUB_TOKEN`: 60 requests/hour
  - With `GITHUB_TOKEN`: 5,000 requests/hour

---

## Testing with cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"name":"John","password":"secret"}' | jq -r '.token')

# Use the token
curl http://localhost:8787/registry \
  -H "Authorization: Bearer $TOKEN"

# Issue an item
curl -X POST http://localhost:8787/issue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "uuid",
    "items": [{"item_no": "ITEM001", "quantity": 1}]
  }'
```

---

## TypeScript Types

For frontend development, here are the TypeScript interfaces:

```typescript
// See app/types.ts for complete type definitions

interface InventoryItem {
  item_no: string;
  name: string;
  quantity: number;
  available: number;
  price?: string | number | null;
  location?: string | null;
  resources?: string | null;
}

interface Issue {
  issue_id: string;
  item_no: string;
  item_name: string;
  quantity: number;
  issue_date: string;
  expected_return_date: string | null;
  returned: boolean;
  returned_quantity?: number;
  project_id: string;
  project_name: string;
}

interface Project {
  project_id: string;
  project_name: string;
  description?: string;
  notion_page_id?: string;
  github_repo?: string;
  doc_urls?: { name: string; url: string }[];
  members?: string[];
  managers?: string[];
  pool?: string;
}
```
