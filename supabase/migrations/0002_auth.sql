-- SynapTest — Milestone 2b-1 (Login + Roles)
--
-- Adds authentication scaffolding: a `profiles` table linking each Supabase
-- auth user to a role + centre, a teacher owner on batches, and a link from a
-- student row to its login profile.
--
-- ⚠️ NO Row Level Security POLICIES are defined here. Per-user RLS enforcement
-- is Milestone 2b-2 (a separate focused pass). In this milestone all data
-- access remains server-side via the secret service key, and ownership is
-- enforced in server code. If the SQL Editor offers "Run and enable RLS", that
-- is fine — the service key bypasses RLS and these tables stay server-only —
-- but the granular per-row policies are intentionally deferred.

-- Links a Supabase auth user to a role and a centre.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','teacher','student')),
  centre_id uuid references centres(id) on delete set null,
  full_name text,
  created_at timestamptz default now()
);

-- Which teacher owns a batch (one teacher per batch is fine for now).
alter table batches add column teacher_id uuid references profiles(id) on delete set null;

-- Links a student row to its login profile.
-- Nullable: seeded students may have no login yet.
alter table students add column profile_id uuid references profiles(id) on delete set null;

create index on profiles (centre_id);
create index on students (profile_id);
create index on batches (teacher_id);
