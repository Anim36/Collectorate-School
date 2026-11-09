-- The checks of step 2a to 2c, read straight from the live database.

\echo '=== 2a. Unique constraints ==='
select
  t.tablename as "table",
  i.indexname as "unique index",
  pg_get_indexdef(ix.indexrelid) as "definition"
from pg_index ix
join pg_class c on c.oid = ix.indexrelid
join pg_indexes i on i.indexname = c.relname
join pg_tables t on t.tablename = i.tablename
where i.schemaname = 'public'
  and ix.indisunique
  and not ix.indisprimary
  and t.tablename in (
    'attendance', 'exam_results', 'receipts', 'users', 'payments', 'fees',
    'students', 'sections', 'fee_structure', 'result_sheets'
  )
order by 1, 2;

\echo '=== 2b. onDelete rules on the student and teacher relations ==='
select
  conrelid::regclass::text as "child table",
  conname,
  case
    when pg_get_constraintdef(oid) like '%ON DELETE RESTRICT%' then 'RESTRICT'
    when pg_get_constraintdef(oid) like '%ON DELETE SET NULL%' then 'SET NULL'
    when pg_get_constraintdef(oid) like '%ON DELETE CASCADE%' then 'CASCADE'
    else 'NO ACTION'
  end as "on delete"
from pg_constraint
where contype = 'f'
  and confrelid::regclass::text in ('students', 'teachers', 'users')
order by 1, 2;

\echo '=== 2c. Indexes on foreign keys and filter fields ==='
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'users', 'classes', 'sections', 'students', 'attendance', 'attendance_sheets',
    'exam_results', 'result_sheets', 'fees', 'fee_structure', 'payments',
    'notices', 'gallery_photos', 'audit_log'
  )
order by tablename, indexname;
