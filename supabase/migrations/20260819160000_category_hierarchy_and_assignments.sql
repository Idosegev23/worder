-- ============================================================
-- WordQuest — היררכיית קטגוריות + שיוך ידני של תלמידים
-- להריץ ב-Supabase Dashboard → SQL Editor
-- בטוח להרצה חוזרת (idempotent)
-- ============================================================

-- 1) קטגוריית אב: כיתה מכילה יחידות
alter table worder_categories
  add column if not exists parent_id bigint
  references worder_categories(id) on delete cascade;

create index if not exists worder_categories_parent_id_idx
  on worder_categories(parent_id);

-- 2) שיוך ידני: איזה תלמיד רואה איזו קטגוריה
create table if not exists worder_user_categories (
  id          bigserial primary key,
  user_id     uuid   not null references worder_profiles(id)   on delete cascade,
  category_id bigint not null references worder_categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists worder_user_categories_user_id_idx
  on worder_user_categories(user_id);

-- 3) RLS — באותה מדיניות פתוחה כמו שאר טבלאות worder_
--    (לאפליקציה אין Supabase Auth, הכל דרך מפתח anon)
alter table worder_user_categories enable row level security;

drop policy if exists worder_user_categories_all on worder_user_categories;
create policy worder_user_categories_all
  on worder_user_categories for all
  using (true) with check (true);

-- 4) בדיקה
select
  (select count(*) from information_schema.columns
     where table_name='worder_categories' and column_name='parent_id') as parent_id_exists,
  (select count(*) from information_schema.tables
     where table_name='worder_user_categories')                        as join_table_exists;
