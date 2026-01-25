# Database Schema

RoboDex uses **Supabase** (PostgreSQL) as its database. This document details all tables, relationships, and stored functions.

## 📊 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     members     │       │     projects    │       │      pool       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ member_id (PK)  │◄──┐   │ project_id (PK) │   ┌──▶│ pool_id (PK)    │
│ name            │   │   │ project_name    │   │   │ name            │
│ phone           │   │   │ description     │   │   │ description     │
│ password        │   │   │ notion_page_id  │   │   │ managers[]      │
│ email           │   │   │ github_repo     │   │   └─────────────────┘
└─────────────────┘   │   │ doc_urls[]      │   │
                      │   │ members[]       │───┘
                      │   │ managers[]      │
                      │   │ pool (FK)       │───────
                      │   └─────────────────┘
                      │            ▲
                      │            │
┌─────────────────┐   │   ┌───────┴─────────┐       ┌─────────────────┐
│    inventory    │   │   │     issues      │       │                 │
├─────────────────┤   │   ├─────────────────┤       │    Functions    │
│ item_no (PK)    │◄──┼───│ item_no (FK)    │       │                 │
│ name            │   │   │ issue_id (PK)   │       │ issue_items()   │
│ quantity        │   └───│ member_id (FK)  │       │ return_issue()  │
│ available       │       │ project_id (FK) │       │ return_items()  │
│ price           │       │ quantity        │       │ get_project_... │
│ location        │       │ issue_date      │       │ get_members_... │
│ resources       │       │ expected_return │       │ get_pool_...    │
└─────────────────┘       │ returned        │       │ update_member..│
                          │ returned_qty    │       └─────────────────┘
                          └─────────────────┘
```

---

## 📋 Tables

### `members`

User accounts for the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `member_id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Display name |
| `phone` | VARCHAR(20) | | Phone number |
| `password` | VARCHAR(255) | NOT NULL | Hashed password |
| `email` | VARCHAR(255) | | Email address |

```sql
CREATE TABLE members (
    member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255)
);
```

---

### `inventory`

Items available in the inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `item_no` | VARCHAR(50) | PRIMARY KEY | Item identifier |
| `name` | VARCHAR(255) | NOT NULL | Item name |
| `quantity` | INTEGER | NOT NULL, DEFAULT 0 | Total quantity |
| `available` | INTEGER | NOT NULL, DEFAULT 0 | Available quantity |
| `price` | DECIMAL(10,2) | | Unit price |
| `location` | VARCHAR(255) | | Storage location |
| `resources` | TEXT | | URL to documentation |

```sql
CREATE TABLE inventory (
    item_no VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2),
    location VARCHAR(255),
    resources TEXT
);
```

**Business Rules:**
- `available` should always be ≤ `quantity`
- When items are issued, `available` decreases
- When items are returned, `available` increases

---

### `projects`

Projects that items can be issued to.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `project_id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `project_name` | VARCHAR(255) | NOT NULL | Project name |
| `description` | TEXT | | Project description |
| `notion_page_id` | TEXT | | Notion page URL |
| `github_repo` | VARCHAR(255) | | GitHub repo (owner/repo) |
| `doc_urls` | JSONB | DEFAULT '[]' | Array of doc links |
| `members` | UUID[] | DEFAULT '{}' | Array of member IDs |
| `managers` | UUID[] | DEFAULT '{}' | Array of manager IDs |
| `pool` | UUID | REFERENCES pool(pool_id) | Associated pool |

```sql
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    notion_page_id TEXT,
    github_repo VARCHAR(255),
    doc_urls JSONB DEFAULT '[]',
    members UUID[] DEFAULT '{}',
    managers UUID[] DEFAULT '{}',
    pool UUID REFERENCES pool(pool_id)
);
```

**`doc_urls` Format:**
```json
[
  {"name": "Design Doc", "url": "https://..."},
  {"name": "Wiki", "url": "https://..."}
]
```

---

### `issues`

Tracks items issued to projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `issue_id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `item_no` | VARCHAR(50) | NOT NULL, REFERENCES inventory(item_no) | Item issued |
| `member_id` | UUID | NOT NULL, REFERENCES members(member_id) | Who issued it |
| `project_id` | UUID | NOT NULL, REFERENCES projects(project_id) | Target project |
| `quantity` | INTEGER | NOT NULL | Quantity issued |
| `issue_date` | TIMESTAMP | DEFAULT NOW() | When issued |
| `expected_return_date` | DATE | | Expected return |
| `returned` | BOOLEAN | DEFAULT FALSE | Is fully returned? |
| `returned_quantity` | INTEGER | DEFAULT 0 | Quantity returned |

```sql
CREATE TABLE issues (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_no VARCHAR(50) NOT NULL REFERENCES inventory(item_no),
    member_id UUID NOT NULL REFERENCES members(member_id),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    quantity INTEGER NOT NULL,
    issue_date TIMESTAMP DEFAULT NOW(),
    expected_return_date DATE,
    returned BOOLEAN DEFAULT FALSE,
    returned_quantity INTEGER DEFAULT 0
);
```

---

### `pool`

Resource pools for grouping projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `pool_id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Pool name |
| `description` | TEXT | | Pool description |
| `managers` | UUID[] | DEFAULT '{}' | Manager member IDs |

```sql
CREATE TABLE pool (
    pool_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    managers UUID[] DEFAULT '{}'
);
```

---

## 🔧 Stored Functions

### `issue_items`

Issue multiple items to a project in a single transaction.

```sql
CREATE OR REPLACE FUNCTION issue_items(
    p_member_id UUID,
    p_project_id UUID,
    p_items JSONB,
    p_return_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    item RECORD;
    v_issue_id UUID;
    result_ids UUID[] := '{}';
BEGIN
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_no VARCHAR, quantity INTEGER)
    LOOP
        -- Check availability
        IF (SELECT available FROM inventory WHERE item_no = item.item_no) < item.quantity THEN
            RAISE EXCEPTION 'Insufficient quantity for item %', item.item_no;
        END IF;

        -- Create issue record
        INSERT INTO issues (item_no, member_id, project_id, quantity, expected_return_date)
        VALUES (item.item_no, p_member_id, p_project_id, item.quantity, p_return_date)
        RETURNING issue_id INTO v_issue_id;

        -- Update inventory
        UPDATE inventory SET available = available - item.quantity WHERE item_no = item.item_no;

        result_ids := array_append(result_ids, v_issue_id);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'issue_ids', result_ids);
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT issue_items(
    'member-uuid',
    'project-uuid',
    '[{"item_no": "ITEM001", "quantity": 2}]'::jsonb,
    '2024-12-31'
);
```

---

### `return_issue`

Fully return all items from an issue.

```sql
CREATE OR REPLACE FUNCTION return_issue(
    p_issue_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_item_no VARCHAR;
    v_quantity INTEGER;
BEGIN
    -- Get issue details
    SELECT item_no, quantity - returned_quantity INTO v_item_no, v_quantity
    FROM issues WHERE issue_id = p_issue_id;

    IF v_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nothing to return');
    END IF;

    -- Update issue
    UPDATE issues SET returned = TRUE, returned_quantity = quantity
    WHERE issue_id = p_issue_id;

    -- Update inventory
    UPDATE inventory SET available = available + v_quantity WHERE item_no = v_item_no;

    RETURN jsonb_build_object('success', true, 'returned_quantity', v_quantity);
END;
$$ LANGUAGE plpgsql;
```

---

### `return_items`

Partially return items from an issue.

```sql
CREATE OR REPLACE FUNCTION return_items(
    p_issue_id UUID,
    p_quantity INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_item_no VARCHAR;
    v_remaining INTEGER;
    v_total_quantity INTEGER;
BEGIN
    -- Get issue details
    SELECT item_no, quantity - returned_quantity, quantity
    INTO v_item_no, v_remaining, v_total_quantity
    FROM issues WHERE issue_id = p_issue_id;

    IF p_quantity > v_remaining THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot return more than remaining');
    END IF;

    -- Update issue
    UPDATE issues SET
        returned_quantity = returned_quantity + p_quantity,
        returned = (returned_quantity + p_quantity >= quantity)
    WHERE issue_id = p_issue_id;

    -- Update inventory
    UPDATE inventory SET available = available + p_quantity WHERE item_no = v_item_no;

    RETURN jsonb_build_object(
        'success', true,
        'returned_quantity', p_quantity,
        'remaining_quantity', v_remaining - p_quantity
    );
END;
$$ LANGUAGE plpgsql;
```

---

### `get_project_items`

Get analytics for items issued to a project.

```sql
CREATE OR REPLACE FUNCTION get_project_items(
    p_project_id UUID
) RETURNS TABLE (
    item_no VARCHAR,
    item_name VARCHAR,
    total_quantity BIGINT,
    price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.item_no,
        inv.name,
        SUM(i.quantity - COALESCE(i.returned_quantity, 0))::BIGINT,
        inv.price
    FROM issues i
    JOIN inventory inv ON i.item_no = inv.item_no
    WHERE i.project_id = p_project_id AND i.returned = FALSE
    GROUP BY i.item_no, inv.name, inv.price;
END;
$$ LANGUAGE plpgsql;
```

---

### `get_members_by_ids`

Batch fetch members by their IDs.

```sql
CREATE OR REPLACE FUNCTION get_members_by_ids(
    p_member_ids UUID[]
) RETURNS TABLE (
    member_id UUID,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.member_id, m.name, m.phone, m.email
    FROM members m
    WHERE m.member_id = ANY(p_member_ids);
END;
$$ LANGUAGE plpgsql;
```

---

### `get_pool_details`

Get pool information with manager details.

```sql
CREATE OR REPLACE FUNCTION get_pool_details(
    p_pool_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_pool RECORD;
    v_managers JSONB;
BEGIN
    SELECT * INTO v_pool FROM pool WHERE pool_id = p_pool_id;

    SELECT jsonb_agg(jsonb_build_object(
        'member_id', m.member_id,
        'name', m.name
    )) INTO v_managers
    FROM members m
    WHERE m.member_id = ANY(v_pool.managers);

    RETURN jsonb_build_object(
        'pool_id', v_pool.pool_id,
        'name', v_pool.name,
        'description', v_pool.description,
        'managers', COALESCE(v_managers, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;
```

---

### `update_member_password`

Update a member's password.

```sql
CREATE OR REPLACE FUNCTION update_member_password(
    p_member_id UUID,
    p_current_password VARCHAR,
    p_new_password VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_stored_password VARCHAR;
BEGIN
    SELECT password INTO v_stored_password FROM members WHERE member_id = p_member_id;

    IF v_stored_password != p_current_password THEN
        RETURN jsonb_build_object('success', false, 'error', 'Current password is incorrect');
    END IF;

    UPDATE members SET password = p_new_password WHERE member_id = p_member_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 Indexes

Recommended indexes for performance:

```sql
-- Issues by member (for /my-issues)
CREATE INDEX idx_issues_member ON issues(member_id);

-- Issues by project (for project analytics)
CREATE INDEX idx_issues_project ON issues(project_id);

-- Active issues only
CREATE INDEX idx_issues_active ON issues(returned) WHERE returned = FALSE;

-- Inventory search
CREATE INDEX idx_inventory_name ON inventory(name);
CREATE INDEX idx_inventory_location ON inventory(location);
```

---

## 🔐 Row Level Security (Optional)

If using Supabase's RLS:

```sql
-- Enable RLS
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Members can only see their own issues
CREATE POLICY issues_select ON issues FOR SELECT
    USING (member_id = auth.uid());

-- Members can only insert their own issues
CREATE POLICY issues_insert ON issues FOR INSERT
    WITH CHECK (member_id = auth.uid());
```

---

## 🚀 Setup Instructions

1. Create a Supabase project
2. Go to SQL Editor
3. Run `supabase.sql` to create all tables and functions
4. (Optional) Add sample data:

```sql
-- Sample member
INSERT INTO members (name, password) VALUES ('Admin', 'admin123');

-- Sample inventory
INSERT INTO inventory (item_no, name, quantity, available, location)
VALUES 
    ('ARD001', 'Arduino Uno', 10, 10, 'Shelf A1'),
    ('RPI001', 'Raspberry Pi 4', 5, 5, 'Shelf B2');

-- Sample project
INSERT INTO projects (project_name, description)
VALUES ('Test Project', 'A test project');
```

---

## 📊 Useful Queries

### Check inventory status
```sql
SELECT item_no, name, quantity, available,
       quantity - available AS issued
FROM inventory
ORDER BY available ASC;
```

### Active issues with details
```sql
SELECT 
    i.issue_id,
    inv.name AS item_name,
    i.quantity,
    m.name AS issued_by,
    p.project_name,
    i.issue_date
FROM issues i
JOIN inventory inv ON i.item_no = inv.item_no
JOIN members m ON i.member_id = m.member_id
JOIN projects p ON i.project_id = p.project_id
WHERE i.returned = FALSE
ORDER BY i.issue_date DESC;
```

### Project item summary
```sql
SELECT 
    p.project_name,
    COUNT(DISTINCT i.item_no) AS unique_items,
    SUM(i.quantity - COALESCE(i.returned_quantity, 0)) AS total_items
FROM projects p
LEFT JOIN issues i ON p.project_id = i.project_id AND i.returned = FALSE
GROUP BY p.project_id, p.project_name;
```
