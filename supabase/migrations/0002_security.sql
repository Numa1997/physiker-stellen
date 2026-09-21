-- Row-Level Security. Applied 2026-09-21 as migration 0002_security.
--
-- In one line: a signed-in user may read every table and write only
-- `marks`. This is what lets the repository be public — without a session
-- the API returns zero rows, so the publishable key in app/config.js
-- grants nothing on its own.
--
-- The daily agent writes postings/journal/journal_changes as the project
-- owner, which bypasses RLS, so no write policy is needed for it and no
-- key has to live in its prompt.

alter table public.postings        enable row level security;
alter table public.journal         enable row level security;
alter table public.journal_changes enable row level security;
alter table public.marks           enable row level security;
alter table public.companies       enable row level security;
alter table public.job_boards      enable row level security;
alter table public.meta            enable row level security;

create policy "read" on public.postings        for select to authenticated using (true);
create policy "read" on public.journal         for select to authenticated using (true);
create policy "read" on public.journal_changes for select to authenticated using (true);
create policy "read" on public.companies       for select to authenticated using (true);
create policy "read" on public.job_boards      for select to authenticated using (true);
create policy "read" on public.meta            for select to authenticated using (true);

create policy "read"  on public.marks for select to authenticated using (true);
create policy "write" on public.marks for all    to authenticated using (true) with check (true);
