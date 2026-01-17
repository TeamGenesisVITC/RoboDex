create table members (
  member_id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  password text not null
);

create table projects (
  project_id uuid primary key default gen_random_uuid(),
  project_name text not null
);

create table inventory (
  item_no text primary key,
  name text not null,
  quantity int not null,
  available int not null,
  price numeric,
  location text,
  check (available >= 0 and available <= quantity)
);

create table issues (
  id uuid primary key default gen_random_uuid(),

  issue_id uuid not null,
  item_no text not null references inventory(item_no),

  quantity int not null check (quantity > 0),

  member_id uuid not null references members(member_id),
  project_id uuid not null references projects(project_id),

  issued_date timestamptz default now(),
  return_date timestamptz,
  returned boolean default false
);

create index idx_issues_issue_id on issues(issue_id);
create index idx_issues_item_no on issues(item_no);
create index idx_issues_member on issues(member_id);
create index idx_issues_returned on issues(returned);

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
