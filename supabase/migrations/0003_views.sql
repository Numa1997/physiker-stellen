-- journal_by_day. Applied 2026-09-21 as migration 0003_views.
--
-- The daily log pre-grouped, so the page does no arithmetic. A day can
-- hold more than one run (the schedule fires twice so that one firing
-- lands on 06:30 Berlin in both summer and winter), hence `runs` and the
-- "latest wins" aggregates.

create or replace view public.journal_by_day as
  select run_date,
         count(*) as runs,
         (array_agg(status ORDER BY started_at DESC))[1] as last_status,
         sum((select count(*) from journal_changes c
               where c.journal_id = j.id and c.direction = 'in')) as n_in,
         sum((select count(*) from journal_changes c
               where c.journal_id = j.id and c.direction = 'out')) as n_out,
         (array_agg(checked ORDER BY started_at DESC))[1] as checked,
         (array_agg(live ORDER BY started_at DESC))[1] as live
    from journal j
   group by run_date;

-- REQUIRED, and the reason is not cosmetic.
--
-- A Postgres view runs as its OWNER by default. This one is owned by
-- `postgres`, so without the line below it reads `journal` and
-- `journal_changes` with the owner's rights and hands the rows to whoever
-- queries the view — bypassing the row-level security on those tables
-- entirely. The effect is that an ANONYMOUS caller, holding nothing but
-- the publishable key that ships in app/config.js, can read the aggregated
-- daily log: run dates, how many postings moved, how many were checked.
--
-- `security_invoker = true` makes the view run as the CALLER instead, so
-- the base tables' policies apply and an anonymous request returns zero
-- rows. Never drop this line, and never `create or replace` this view
-- without re-applying it.
--
-- Found in review on 2026-09-21; the first version of this migration
-- shipped without it.
alter view public.journal_by_day set (security_invoker = true);
