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
