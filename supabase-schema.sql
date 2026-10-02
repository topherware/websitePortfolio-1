-- Run manually in a non-production Supabase project after reviewing table and bucket names.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_content (
  id text primary key default 'site',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint portfolio_content_singleton check (id = 'site')
);

alter table public.admin_users enable row level security;
alter table public.portfolio_content enable row level security;

drop policy if exists "Admins can read their authorization" on public.admin_users;
create policy "Admins can read their authorization"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Authorized admins can read content" on public.portfolio_content;
create policy "Authorized admins can read content"
on public.portfolio_content for select
to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Authorized admins can update content" on public.portfolio_content;
create policy "Authorized admins can update content"
on public.portfolio_content for update
to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop view if exists public.portfolio_public_content;
create view public.portfolio_public_content as
select
  p.id,
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          p.content,
          '{projects}',
          coalesce((
            select jsonb_agg(item order by coalesce((item->>'order')::int, 0))
            from jsonb_array_elements(coalesce(p.content->'projects', '[]'::jsonb)) item
            where lower(coalesce(item->>'status', 'published')) = 'published'
          ), '[]'::jsonb),
          true
        ),
        '{certificates}',
        coalesce((
          select jsonb_agg(item order by coalesce((item->>'order')::int, 0))
          from jsonb_array_elements(coalesce(p.content->'certificates', '[]'::jsonb)) item
          where lower(coalesce(item->>'status', 'published')) = 'published'
        ), '[]'::jsonb),
        true
      ),
      '{experiences}',
      coalesce((
        select jsonb_agg(item)
        from jsonb_array_elements(coalesce(p.content->'experiences', '[]'::jsonb)) item
        where lower(coalesce(item->>'status', 'published')) = 'published'
      ), '[]'::jsonb),
      true
    ),
    '{testimonials}',
    coalesce((
      select jsonb_agg(item order by coalesce((item->>'order')::int, 0))
      from jsonb_array_elements(coalesce(p.content->'testimonials', '[]'::jsonb)) item
      where lower(coalesce(item->>'status', 'published')) = 'published'
    ), '[]'::jsonb),
    true
  ) as content,
  p.updated_at
from public.portfolio_content p;

revoke all on public.portfolio_content from anon;
grant select on public.portfolio_public_content to anon, authenticated;
grant select, update on public.portfolio_content to authenticated;
grant select on public.admin_users to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.admin_users from anon, authenticated;

-- Create a public bucket named portfolio in Storage before applying these policies.
drop policy if exists "Public portfolio assets are readable" on storage.objects;
create policy "Public portfolio assets are readable"
on storage.objects for select
to public
using (bucket_id = 'portfolio');

drop policy if exists "Authorized admins can upload portfolio assets" on storage.objects;
create policy "Authorized admins can upload portfolio assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio'
  and exists (select 1 from public.admin_users where user_id = auth.uid())
);

-- Invite the buyer in Supabase Auth, then grant their UUID access before activation:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID');
-- Add the existing CMS JSON without overwriting edited data:
-- insert into public.portfolio_content (id, content) values ('site', '{...}'::jsonb)
-- on conflict (id) do nothing;
