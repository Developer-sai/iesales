-- iesales.ie schema. Idempotent: safe to re-run in the Supabase SQL Editor.
-- Security model: clients can only write the columns listed in GRANTs below.
-- Counters, is_hidden, flag_count and moderation fields are written only by
-- SECURITY DEFINER triggers/functions, so users cannot bypass moderation.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24 and username ~ '^[A-Za-z0-9_]+$'),
  avatar_color text not null default '#059669' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.moderators (
  user_id uuid primary key references auth.users on delete cascade
);

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  brand text not null check (char_length(brand) between 1 and 60),
  category text not null check (category in ('tech','home','fashion','grocery','kids','travel','other')),
  retailer text not null check (char_length(retailer) between 1 and 60),
  location_type text not null check (location_type in ('online','in-store','both')),
  county text check (county is null or char_length(county) <= 30),
  store_branch text check (store_branch is null or char_length(store_branch) <= 80),
  deal_url text check (deal_url is null or (deal_url ~* '^https://' and char_length(deal_url) <= 500)),
  sale_price numeric(10,2) not null check (sale_price > 0 and sale_price < 100000),
  prior_price numeric(10,2) check (prior_price is null or prior_price > sale_price),
  prior_evidence_url text check (prior_evidence_url is null or (prior_evidence_url ~* '^https://' and char_length(prior_evidence_url) <= 500)),
  promo_code text check (promo_code is null or char_length(promo_code) <= 40),
  note text check (note is null or char_length(note) <= 280),
  image_path text check (image_path is null or char_length(image_path) <= 200),
  photo_approved boolean not null default false,
  legit_votes int not null default 0,
  fake_votes int not null default 0,
  expired_votes int not null default 0,
  comment_count int not null default 0,
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  moderation_reason text,
  created_at timestamptz not null default now(),
  -- Online/both deals need a link; in-store/both deals need a county.
  constraint deals_online_needs_url check (location_type = 'in-store' or deal_url is not null),
  constraint deals_instore_needs_county check (location_type = 'online' or county is not null),
  -- A claimed prior price must come with evidence (a link or a photo).
  constraint deals_prior_needs_evidence check (prior_price is null or prior_evidence_url is not null or image_path is not null)
);
-- Partial indexes match the public feed queries exactly (visible rows, newest first).
create index if not exists deals_visible_created_idx on public.deals (created_at desc) where not is_hidden;
create index if not exists deals_user_idx on public.deals (user_id);

create table if not exists public.deal_votes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('legit','fake','expired')),
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  moderation_reason text,
  created_at timestamptz not null default now()
);

create or replace function public.poll_options_valid(o jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(o) = 'array'
     and jsonb_array_length(o) between 2 and 6
     and not exists (
       select 1 from jsonb_array_elements(o) e
       where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and 80
     );
$$;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  question text not null check (char_length(question) between 5 and 140),
  options jsonb not null check (public.poll_options_valid(options)),
  option_counts jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  option_index int not null check (option_index between 0 and 5),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  county text check (county is null or char_length(county) <= 30),
  question text not null check (char_length(question) between 5 and 280),
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  flag_count int not null default 0,
  is_hidden boolean not null default false,
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('deal','comment','poll','discussion','reply')),
  target_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('illegal','misleading','spam','personal_data','copyright','other')),
  explanation text check (explanation is null or char_length(explanation) <= 500),
  weight smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

-- Supporting indexes (feed reads, FK lookups, fast account deletion cascades).
create index if not exists comments_deal_created_idx on public.comments (deal_id, created_at);
create index if not exists comments_user_idx on public.comments (user_id);
create index if not exists deal_votes_user_idx on public.deal_votes (user_id);
create index if not exists polls_visible_idx on public.polls (is_pinned desc, created_at desc) where not is_hidden;
create index if not exists polls_user_idx on public.polls (user_id);
create index if not exists poll_votes_user_idx on public.poll_votes (user_id);
create index if not exists discussions_visible_idx on public.discussions (created_at desc) where not is_hidden;
create index if not exists discussions_user_idx on public.discussions (user_id);
create index if not exists replies_discussion_idx on public.discussion_replies (discussion_id, created_at);
create index if not exists replies_user_idx on public.discussion_replies (user_id);
create index if not exists post_flags_user_idx on public.post_flags (user_id);

-- DSA notice-and-action: anyone (signed in or not) can submit a notice.
create table if not exists public.takedown_notices (
  id uuid primary key default gen_random_uuid(),
  notifier_name text check (notifier_name is null or char_length(notifier_name) <= 100),
  notifier_email text not null check (char_length(notifier_email) between 5 and 200 and notifier_email like '%_@_%._%'),
  target_url text not null check (char_length(target_url) between 5 and 500),
  explanation text not null check (char_length(explanation) between 20 and 2000),
  good_faith boolean not null check (good_faith),
  status text not null default 'open' check (status in ('open','actioned','rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profile with a friendly default handle
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  candidate text;
begin
  loop
    candidate := 'Shopper_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Rate limits (per user, per table)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  max_rows int := tg_argv[0]::int;
  window_mins int := tg_argv[1]::int;
  recent int;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - make_interval(mins => $2)', tg_table_name)
    into recent using new.user_id, window_mins;
  if recent >= max_rows then
    raise exception 'Slow down: rate limit reached. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('deals', 8, 60), ('comments', 20, 60), ('deal_votes', 60, 60),
    ('polls', 3, 60), ('discussions', 6, 60), ('discussion_replies', 20, 60),
    ('post_flags', 20, 60)
  ) as t(tbl, max_rows, win) loop
    execute format('drop trigger if exists rate_limit on public.%I', r.tbl);
    execute format('create trigger rate_limit before insert on public.%I for each row execute function public.enforce_rate_limit(%L, %L)', r.tbl, r.max_rows, r.win);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Counter triggers (server-side, SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.recount_deal_votes() returns trigger
language plpgsql security definer set search_path = public as $$
declare did uuid := coalesce(new.deal_id, old.deal_id);
begin
  update public.deals set
    legit_votes   = (select count(*) from public.deal_votes where deal_id = did and vote_type = 'legit'),
    fake_votes    = (select count(*) from public.deal_votes where deal_id = did and vote_type = 'fake'),
    expired_votes = (select count(*) from public.deal_votes where deal_id = did and vote_type = 'expired')
  where id = did;
  return null;
end $$;

drop trigger if exists deal_votes_recount on public.deal_votes;
create trigger deal_votes_recount after insert or update or delete on public.deal_votes
  for each row execute function public.recount_deal_votes();

-- Denormalised comment counter (write-time aggregation: reads never COUNT()).
create or replace function public.recount_comments() returns trigger
language plpgsql security definer set search_path = public as $$
declare did uuid := coalesce(new.deal_id, old.deal_id);
begin
  update public.deals set comment_count = (
    select count(*) from public.comments where deal_id = did and not is_hidden
  ) where id = did;
  return null;
end $$;

drop trigger if exists comments_recount on public.comments;
create trigger comments_recount after insert or delete or update of is_hidden on public.comments
  for each row execute function public.recount_comments();

create or replace function public.recount_poll_votes() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.poll_id, old.poll_id);
begin
  update public.polls p set option_counts = (
    select coalesce(jsonb_agg(coalesce(c.n, 0) order by g.i), '[]'::jsonb)
    from generate_series(0, jsonb_array_length(p.options) - 1) g(i)
    left join (select option_index, count(*) n from public.poll_votes where poll_id = pid group by 1) c
      on c.option_index = g.i
  ) where p.id = pid;
  return null;
end $$;

drop trigger if exists poll_votes_recount on public.poll_votes;
create trigger poll_votes_recount after insert or update or delete on public.poll_votes
  for each row execute function public.recount_poll_votes();

-- Initialise zero counts when a poll is created.
create or replace function public.init_poll_counts() returns trigger
language plpgsql as $$
begin
  new.option_counts := (select coalesce(jsonb_agg(0), '[]'::jsonb) from generate_series(1, jsonb_array_length(new.options)));
  new.is_pinned := false;
  return new;
end $$;
drop trigger if exists poll_init on public.polls;
create trigger poll_init before insert on public.polls
  for each row execute function public.init_poll_counts();

-- Poll votes: option must exist.
create or replace function public.check_poll_option() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.option_index >= (select jsonb_array_length(options) from public.polls where id = new.poll_id) then
    raise exception 'Invalid poll option';
  end if;
  return new;
end $$;
drop trigger if exists poll_vote_check on public.poll_votes;
create trigger poll_vote_check before insert on public.poll_votes
  for each row execute function public.check_poll_option();

-- Flags: weight 0 for accounts younger than 1 hour (anti-brigading), then
-- recount and auto-hide at 5 or more weighted flags (hide-first, human review).
create or replace function public.flag_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.weight := case when exists (
    select 1 from public.profiles where id = new.user_id and created_at < now() - interval '1 hour'
  ) then 1 else 0 end;
  return new;
end $$;
drop trigger if exists flag_weight on public.post_flags;
create trigger flag_weight before insert on public.post_flags
  for each row execute function public.flag_before_insert();

create or replace function public.flag_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tbl text;
  total int;
begin
  tbl := case new.target_type
    when 'deal' then 'deals' when 'comment' then 'comments' when 'poll' then 'polls'
    when 'discussion' then 'discussions' when 'reply' then 'discussion_replies' end;
  select coalesce(sum(weight), 0) into total from public.post_flags
    where target_type = new.target_type and target_id = new.target_id;
  execute format(
    'update public.%I set flag_count = $1,
       is_hidden = is_hidden or $1 >= 5,
       moderation_reason = case when not is_hidden and $1 >= 5 then ''Hidden automatically after community reports; awaiting human review.'' else moderation_reason end
     where id = $2', tbl) using total, new.target_id;
  return null;
end $$;
drop trigger if exists flag_recount on public.post_flags;
create trigger flag_recount after insert on public.post_flags
  for each row execute function public.flag_after_insert();

-- ---------------------------------------------------------------------------
-- Moderator + account functions
-- ---------------------------------------------------------------------------
create or replace function public.moderate_content(p_type text, p_id uuid, p_hide boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare tbl text;
begin
  if not public.is_moderator() then raise exception 'Not authorised'; end if;
  tbl := case p_type
    when 'deal' then 'deals' when 'comment' then 'comments' when 'poll' then 'polls'
    when 'discussion' then 'discussions' when 'reply' then 'discussion_replies' end;
  if tbl is null then raise exception 'Unknown type'; end if;
  execute format('update public.%I set is_hidden = $1, moderation_reason = $2, flag_count = case when $1 then flag_count else 0 end where id = $3', tbl)
    using p_hide, case when p_hide then p_reason else null end, p_id;
  if not p_hide then
    delete from public.post_flags where target_type = p_type and target_id = p_id;
  end if;
end $$;

create or replace function public.set_photo_approved(p_deal uuid, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Not authorised'; end if;
  update public.deals set photo_approved = p_ok where id = p_deal;
end $$;

create or replace function public.set_poll_pinned(p_poll uuid, p_pin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Not authorised'; end if;
  update public.polls set is_pinned = p_pin where id = p_poll;
end $$;

-- Deletes the signed-in user's account. Cascades to profile, deals, votes,
-- comments, polls, discussions, replies and flags. The client removes the
-- user's storage photos first (storage files cannot be removed via SQL).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.moderate_content(text, uuid, boolean, text) from public, anon;
grant execute on function public.moderate_content(text, uuid, boolean, text) to authenticated;
revoke all on function public.set_photo_approved(uuid, boolean) from public, anon;
grant execute on function public.set_photo_approved(uuid, boolean) to authenticated;
revoke all on function public.set_poll_pinned(uuid, boolean) from public, anon;
grant execute on function public.set_poll_pinned(uuid, boolean) to authenticated;
-- Called inside the RLS policies, so every role that reads content needs it (returns false for anon).
revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to anon, authenticated;

-- Trigger functions must not be callable directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_rate_limit() from public, anon, authenticated;
revoke all on function public.recount_deal_votes() from public, anon, authenticated;
revoke all on function public.recount_poll_votes() from public, anon, authenticated;
revoke all on function public.recount_comments() from public, anon, authenticated;
revoke all on function public.check_poll_option() from public, anon, authenticated;
revoke all on function public.flag_before_insert() from public, anon, authenticated;
revoke all on function public.flag_after_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security + column-level grants
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.moderators enable row level security;
alter table public.deals enable row level security;
alter table public.deal_votes enable row level security;
alter table public.comments enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_replies enable row level security;
alter table public.post_flags enable row level security;
alter table public.takedown_notices enable row level security;

-- Supabase grants broad table privileges by default; remove them first.
revoke all on public.profiles, public.moderators, public.deals, public.deal_votes, public.comments,
  public.polls, public.poll_votes, public.discussions, public.discussion_replies,
  public.post_flags, public.takedown_notices from anon, authenticated;

-- profiles
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_color) on public.profiles to authenticated;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- moderators: nobody can read or write through the API (managed in SQL editor)

-- content tables with moderation fields
grant select on public.deals, public.comments, public.polls, public.discussions, public.discussion_replies to anon, authenticated;
-- id may be client-generated: retried submissions then hit the primary key instead of duplicating (idempotent write).
grant insert (id, title, brand, category, retailer, location_type, county, store_branch, deal_url,
              sale_price, prior_price, prior_evidence_url, promo_code, note, image_path)
  on public.deals to authenticated;
grant update (note, promo_code) on public.deals to authenticated;
grant insert (deal_id, body) on public.comments to authenticated;
grant insert (question, options) on public.polls to authenticated;
grant insert (county, question) on public.discussions to authenticated;
grant insert (discussion_id, body) on public.discussion_replies to authenticated;
grant delete on public.deals, public.comments, public.polls, public.discussions, public.discussion_replies to authenticated;

do $$
declare t text;
begin
  foreach t in array array['deals','comments','polls','discussions','discussion_replies'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select using (not is_hidden or user_id = auth.uid() or public.is_moderator())', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (user_id = auth.uid() or public.is_moderator())', t);
  end loop;
end $$;

drop policy if exists deals_update on public.deals;
create policy deals_update on public.deals for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deal_votes: users see and manage only their own vote (counts are on deals)
grant select, insert, delete on public.deal_votes to authenticated;
grant update (vote_type) on public.deal_votes to authenticated;
grant insert (deal_id, vote_type) on public.deal_votes to authenticated;
drop policy if exists deal_votes_select on public.deal_votes;
create policy deal_votes_select on public.deal_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists deal_votes_insert on public.deal_votes;
create policy deal_votes_insert on public.deal_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists deal_votes_update on public.deal_votes;
create policy deal_votes_update on public.deal_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists deal_votes_delete on public.deal_votes;
create policy deal_votes_delete on public.deal_votes for delete to authenticated using (user_id = auth.uid());

-- poll_votes: one vote per user, cannot be changed; counts live on polls
grant select on public.poll_votes to authenticated;
grant insert (poll_id, option_index) on public.poll_votes to authenticated;
drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists poll_votes_insert on public.poll_votes;
create policy poll_votes_insert on public.poll_votes for insert to authenticated with check (user_id = auth.uid());

-- post_flags: reporters are private; moderators can read
grant select on public.post_flags to authenticated;
grant insert (target_type, target_id, reason, explanation) on public.post_flags to authenticated;
drop policy if exists post_flags_select on public.post_flags;
create policy post_flags_select on public.post_flags for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
drop policy if exists post_flags_insert on public.post_flags;
create policy post_flags_insert on public.post_flags for insert to authenticated with check (user_id = auth.uid());

-- takedown notices: anyone may submit; only moderators read
grant insert (notifier_name, notifier_email, target_url, explanation, good_faith) on public.takedown_notices to anon, authenticated;
grant select, update (status) on public.takedown_notices to authenticated;
drop policy if exists notices_insert on public.takedown_notices;
create policy notices_insert on public.takedown_notices for insert to anon, authenticated with check (true);
drop policy if exists notices_select on public.takedown_notices;
create policy notices_select on public.takedown_notices for select to authenticated using (public.is_moderator());
drop policy if exists notices_update on public.takedown_notices;
create policy notices_update on public.takedown_notices for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Public feed view (adds usernames, comment counts, gated photos)
-- Photos from accounts under 1 hour old are withheld until approved or aged.
-- ---------------------------------------------------------------------------
-- Public "Editor" badge for staff-seeded posts (moderators table itself stays private).
create or replace function public.is_editor(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where user_id = uid);
$$;
revoke all on function public.is_editor(uuid) from public;
grant execute on function public.is_editor(uuid) to anon, authenticated;

drop view if exists public.deal_feed;
create view public.deal_feed with (security_invoker = true) as
select
  d.id, d.user_id, p.username, p.avatar_color, public.is_editor(d.user_id) as is_editor,
  d.title, d.brand, d.category, d.retailer, d.location_type, d.county, d.store_branch,
  d.deal_url, d.sale_price, d.prior_price, d.prior_evidence_url, d.promo_code, d.note,
  case when d.image_path is not null and (d.photo_approved or p.created_at < now() - interval '1 hour')
       then d.image_path end as image_path,
  d.legit_votes, d.fake_votes, d.expired_votes, d.flag_count, d.is_hidden, d.moderation_reason,
  d.comment_count,
  d.created_at
from public.deals d
left join public.profiles p on p.id = d.user_id;

revoke all on public.deal_feed from anon, authenticated;
grant select on public.deal_feed to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: deal photos (EU project region recommended)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-photos', 'deal-photos', true, 1500000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "deal photos upload own folder" on storage.objects;
create policy "deal photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'deal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "deal photos delete own or mod" on storage.objects;
create policy "deal photos delete own or mod" on storage.objects for delete to authenticated
  using (bucket_id = 'deal-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));
drop policy if exists "deal photos list own" on storage.objects;
create policy "deal photos list own" on storage.objects for select to authenticated
  using (bucket_id = 'deal-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));

-- Note: no Realtime subscriptions. Realtime connection limits would be the first
-- thing to break in a traffic spike, so clients poll an edge-cached /api/feed instead.

-- To make yourself a moderator after signing in once, run (replace the email):
--   insert into public.moderators (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;
