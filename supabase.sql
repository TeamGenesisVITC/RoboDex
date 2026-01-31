-- ============================================================================
-- ROBODEX INVENTORY MANAGEMENT SYSTEM - COMPLETE DATABASE SETUP
-- ============================================================================
-- This file contains all table definitions and functions needed for Robodex
-- Run this entire file in your Supabase SQL Editor to set up the database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

-- Members table
CREATE TABLE members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  password TEXT NOT NULL
);

-- Projects table
CREATE TABLE projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL
);

-- Inventory table
CREATE TABLE inventory (
  item_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INT NOT NULL,
  available INT NOT NULL,
  price NUMERIC,
  location TEXT,
  CHECK (available >= 0 AND available <= quantity)
);

-- Issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL,
  item_no TEXT NOT NULL REFERENCES inventory(item_no),
  quantity INT NOT NULL CHECK (quantity > 0),
  member_id UUID NOT NULL REFERENCES members(member_id),
  project_id UUID NOT NULL REFERENCES projects(project_id),
  issued_date TIMESTAMPTZ DEFAULT NOW(),
  return_date TIMESTAMPTZ,
  returned BOOLEAN DEFAULT FALSE,
  returned_quantity INT DEFAULT 0 CHECK (returned_quantity <= quantity)
);

-- Create indexes for better performance
CREATE INDEX idx_issues_issue_id ON issues(issue_id);
CREATE INDEX idx_issues_item_no ON issues(item_no);
CREATE INDEX idx_issues_member ON issues(member_id);
CREATE INDEX idx_issues_returned ON issues(returned);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION 1: Issue Items
-- ----------------------------------------------------------------------------
-- Purpose: Issue items from inventory to a project
-- Parameters:
--   - p_member_id: UUID of the member issuing the items
--   - p_project_id: UUID of the project
--   - p_items: JSON array of items to issue [{"item_no": "99", "quantity": 10}]
--   - p_return_date: Optional expected return date
-- Returns: UUID of the created issue
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION issue_items(
  p_member_id UUID,
  p_project_id UUID,
  p_items JSONB,
  p_return_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_issue_id UUID := gen_random_uuid();
  rec JSONB;
  v_qty INT;
  v_item_no TEXT;
  v_available INT;
BEGIN
  -- Validate member exists
  IF NOT EXISTS(SELECT 1 FROM members WHERE member_id = p_member_id) THEN
    RAISE EXCEPTION 'Invalid member_id: %', p_member_id;
  END IF;
  
  -- Validate project exists
  IF NOT EXISTS(SELECT 1 FROM projects WHERE project_id = p_project_id) THEN
    RAISE EXCEPTION 'Invalid project_id: %', p_project_id;
  END IF;

  -- Process each item
  FOR rec IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_no := rec->>'item_no';
    v_qty := (rec->>'quantity')::INT;
    
    -- Check if item exists and get current availability
    SELECT available INTO v_available
    FROM inventory
    WHERE item_no = v_item_no;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item not found: %', v_item_no;
    END IF;
    
    IF v_available < v_qty THEN
      RAISE EXCEPTION 'Insufficient inventory for item %. Available: %, Requested: %',
        v_item_no, v_available, v_qty;
    END IF;
    
    -- Update inventory
    UPDATE inventory
    SET available = available - v_qty
    WHERE item_no = v_item_no;
    
    -- Insert issue record
    INSERT INTO issues (
      issue_id,
      item_no,
      quantity,
      member_id,
      project_id,
      issued_date,
      return_date,
      returned
    ) VALUES (
      new_issue_id,
      v_item_no,
      v_qty,
      p_member_id,
      p_project_id,
      NOW(),
      p_return_date,
      false
    );
    
    RAISE NOTICE 'Successfully issued % units of item %', v_qty, v_item_no;
  END LOOP;
  
  RETURN new_issue_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION 2: Full Return
-- ----------------------------------------------------------------------------
-- Purpose: Return all remaining items from an issue
-- Parameters:
--   - p_issue_id: UUID of the issue to return
-- Returns: void
-- Notes: Handles partial returns correctly by only returning items that 
--        haven't been returned yet (quantity - returned_quantity)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION return_issue(p_issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if issue exists and is not already returned
  IF NOT EXISTS (
    SELECT 1 FROM issues
    WHERE issue_id = p_issue_id
      AND returned = false
  ) THEN
    RAISE EXCEPTION 'Issue not found or already returned: %', p_issue_id;
  END IF;
  
  -- Return remaining items to inventory (quantity - returned_quantity)
  UPDATE inventory i
  SET available = available + (iss.quantity - iss.returned_quantity)
  FROM issues iss
  WHERE iss.issue_id = p_issue_id
    AND iss.item_no = i.item_no
    AND iss.returned = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No items found to return for issue_id: %', p_issue_id;
  END IF;
  
  -- Mark issue as returned AND set returned_quantity equal to quantity
  UPDATE issues
  SET returned = true,
      returned_quantity = quantity,
      return_date = NOW()
  WHERE issue_id = p_issue_id
    AND returned = false;
  
  RAISE NOTICE 'Successfully completed return for issue % (% item records)', p_issue_id, v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION 3: Partial Return
-- ----------------------------------------------------------------------------
-- Purpose: Return a specific quantity of items from an issue
-- Parameters:
--   - p_issue_id: UUID of the issue
--   - p_items: JSON array of items to return [{"item_no": "99", "quantity": 5}]
-- Returns: void
-- Notes: Automatically closes the issue if all items are returned
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION return_items(
  p_issue_id UUID,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  rec JSONB;
  v_qty INT;
  v_item_no TEXT;
  v_current_returned INT;
  v_total_quantity INT;
BEGIN
  -- Validate issue exists and is not fully returned
  IF NOT EXISTS (
    SELECT 1 FROM issues
    WHERE issue_id = p_issue_id
      AND returned = false
  ) THEN
    RAISE EXCEPTION 'Issue not found or already fully returned: %', p_issue_id;
  END IF;
  
  -- Process each item return
  FOR rec IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_no := rec->>'item_no';
    v_qty := (rec->>'quantity')::INT;
    
    -- Get current return status for this item
    SELECT returned_quantity, quantity 
    INTO v_current_returned, v_total_quantity
    FROM issues
    WHERE issue_id = p_issue_id
      AND item_no = v_item_no
      AND returned = false;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % not found in issue % or already returned', 
        v_item_no, p_issue_id;
    END IF;
    
    -- Check if return quantity is valid
    IF v_current_returned + v_qty > v_total_quantity THEN
      RAISE EXCEPTION 'Cannot return % units of item %. Issued: %, Already returned: %, Attempting to return: %',
        v_qty, v_item_no, v_total_quantity, v_current_returned, v_qty;
    END IF;
    
    -- Update issue with returned quantity
    UPDATE issues
    SET returned_quantity = returned_quantity + v_qty
    WHERE issue_id = p_issue_id
      AND item_no = v_item_no
      AND returned = false;
    
    -- Return items to inventory
    UPDATE inventory
    SET available = available + v_qty
    WHERE item_no = v_item_no;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % not found in inventory', v_item_no;
    END IF;
    
    RAISE NOTICE 'Returned % units of item % (total returned: %/%)',
      v_qty, v_item_no, v_current_returned + v_qty, v_total_quantity;
  END LOOP;
  
  -- Auto-close fully returned issues
  UPDATE issues
  SET returned = true,
      return_date = NOW()
  WHERE issue_id = p_issue_id
    AND returned_quantity = quantity
    AND returned = false;
  
  -- Check if issue was fully closed
  IF FOUND THEN
    RAISE NOTICE 'Issue % fully returned and closed', p_issue_id;
  END IF;
END;
$$;

-- ============================================================================
-- TESTING QUERIES (Optional - Uncomment to test)
-- ============================================================================

/*
-- Test issuing items
SELECT issue_items(
  (SELECT member_id FROM members WHERE name = 'Ishaan'),
  (SELECT project_id FROM projects WHERE project_name = 'Robot Arm'),
  '[{"item_no": "99", "quantity": 10}, {"item_no": "100", "quantity": 5}]'::JSONB,
  '2026-01-25'::TIMESTAMPTZ
);

-- Check what was issued
SELECT * FROM issues ORDER BY issued_date DESC LIMIT 5;

-- Check inventory
SELECT item_no, name, quantity, available FROM inventory WHERE item_no IN ('99', '100');

-- Test partial return
SELECT return_items(
  (SELECT issue_id FROM issues ORDER BY issued_date DESC LIMIT 1),
  '[{"item_no": "99", "quantity": 5}]'::JSONB
);

-- Test full return
SELECT return_issue(
  (SELECT issue_id FROM issues ORDER BY issued_date DESC LIMIT 1)
);

-- Verify everything is back
SELECT * FROM issues ORDER BY issued_date DESC LIMIT 5;
SELECT item_no, name, quantity, available FROM inventory WHERE item_no IN ('99', '100');
*/

-- ============================================================================
-- END OF FILE
-- ============================================================================

create or replace function issue_items(
  p_member_id uuid,
  p_project_id uuid,
  p_items jsonb,
  p_return_date timestamptz default null
)
returns uuid
language plpgsql
as $$
declare
  new_issue_id uuid := gen_random_uuid();
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_items)
  loop
    update inventory
    set available = available - (rec->>'quantity')::int
    where item_no = rec->>'item_no'
      and available >= (rec->>'quantity')::int;

    if not found then
      raise exception 'Insufficient inventory for %', rec->>'item_no';
    end if;

    insert into issues (
      issue_id,
      item_no,
      quantity,
      member_id,
      project_id,
      issued_date,
      return_date,
      returned
    ) values (
      new_issue_id,
      rec->>'item_no',
      (rec->>'quantity')::int,
      p_member_id,
      p_project_id,
      now(),
      p_return_date,
      false
    );
  end loop;

  return new_issue_id;
end;
$$;

create or replace function return_issue(p_issue_id uuid)
returns void
language plpgsql
as $$
begin
  update inventory i
  set available = available + iss.quantity
  from issues iss
  where iss.issue_id = p_issue_id
    and iss.item_no = i.item_no
    and iss.returned = false;

  update issues
  set returned = true,
      return_date = now()
  where issue_id = p_issue_id
    and returned = false;
end;
$$;

create or replace function return_items(
  p_issue_id uuid,
  p_items jsonb
)
returns void
language plpgsql
as $$
declare
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(p_items)
  loop
    update inventory
    set available = available + (rec->>'quantity')::int
    where item_no = rec->>'item_no';

    update issues
    set returned = true,
        return_date = now()
    where issue_id = p_issue_id
      and item_no = rec->>'item_no'
      and returned = false
      and quantity >= (rec->>'quantity')::int;

    if not found then
      raise exception 'Invalid return';
    end if;
  end loop;
end;
$$;

CREATE TABLE IF NOT EXISTS kanban (
    column_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_name TEXT NOT NULL,
    color TEXT,
    events UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP FUNCTION IF EXISTS upsert_kanban(JSONB);

DROP FUNCTION IF EXISTS upsert_kanban(JSONB);

CREATE OR REPLACE FUNCTION upsert_kanban(payload JSONB)
RETURNS SETOF kanban AS $$
DECLARE
    cols TEXT := '';
    vals TEXT := '';
    updates TEXT := '';
    k TEXT;
    v JSONB;
    has_column_id BOOLEAN := FALSE;
    target_column_id UUID;
BEGIN
    -- Check if column_id exists in payload
    has_column_id := payload ? 'column_id';
    
    IF has_column_id THEN
        target_column_id := (payload->>'column_id')::uuid;
    END IF;

    FOR k, v IN SELECT key, value FROM jsonb_each(payload)
    LOOP
        IF v IS NULL THEN
            CONTINUE;
        END IF;

        -- Skip column_id for updates (can't update primary key)
        IF has_column_id AND k = 'column_id' THEN
            CONTINUE;
        END IF;

        cols := cols || quote_ident(k) || ', ';

        -- UUID PRIMARY KEY
        IF k = 'column_id' THEN
            vals := vals || format(
                '''%s''::uuid',
                trim(both '"' from v::text)
            ) || ', ';

        -- UUID ARRAY
        ELSIF k = 'events' AND jsonb_typeof(v) = 'array' THEN
            vals := vals || format(
                '(SELECT array_agg(x::uuid)
                FROM jsonb_array_elements_text(%L::jsonb) AS x)',
                v::text
            ) || ', ';

        -- TEXT / other scalars
        ELSE
            vals := vals || quote_literal(trim(both '"' from v::text)) || ', ';
        END IF;

        -- Build update clause (excluding column_id)
        IF k != 'column_id' THEN
            IF k = 'events' AND jsonb_typeof(v) = 'array' THEN
                updates := updates || format(
                    '%I = (SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(%L::jsonb) AS x), ',
                    k, v::text
                );
            ELSE
                updates := updates || format(
                    '%I = %L, ',
                    k, trim(both '"' from v::text)
                );
            END IF;
        END IF;
    END LOOP;

    cols := left(cols, length(cols) - 2);
    vals := left(vals, length(vals) - 2);
    
    IF length(updates) > 0 THEN
        updates := left(updates, length(updates) - 2);
    END IF;

    -- If column_id exists and we have updates, do an UPDATE
    IF has_column_id AND length(updates) > 0 THEN
        RETURN QUERY EXECUTE format(
            'UPDATE kanban SET %s WHERE column_id = %L RETURNING *',
            updates, target_column_id
        );
    -- If column_id exists but no updates, just return the existing row
    ELSIF has_column_id THEN
        RETURN QUERY EXECUTE format(
            'SELECT * FROM kanban WHERE column_id = %L',
            target_column_id
        );
    -- No column_id, do a normal INSERT
    ELSE
        RETURN QUERY EXECUTE format(
            'INSERT INTO kanban (%s) VALUES (%s) RETURNING *',
            cols, vals
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Read All
CREATE OR REPLACE FUNCTION get_all_kanban()
RETURNS SETOF kanban AS $$
BEGIN
    RETURN QUERY SELECT * FROM kanban ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Read Single
CREATE OR REPLACE FUNCTION get_kanban_by_id(target_id UUID)
RETURNS SETOF kanban AS $$
BEGIN
    RETURN QUERY SELECT * FROM kanban WHERE column_id = target_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_kanban(target_id UUID)
RETURNS TEXT AS $$
BEGIN
    DELETE FROM kanban WHERE column_id = target_id;
    RETURN 'Success';
END;
$$ LANGUAGE plpgsql;
