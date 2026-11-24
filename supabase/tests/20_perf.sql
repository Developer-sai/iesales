\set QUIET 1
begin;
alter table public.deals disable trigger rate_limit;
insert into auth.users (id, email) select gen_random_uuid(), 'u'||g||'@x.ie' from generate_series(1,2000) g;
insert into public.deals (user_id, title, brand, category, retailer, location_type, deal_url, sale_price, legit_votes, fake_votes, comment_count, is_hidden, created_at)
select (select id from public.profiles order by random() limit 1), 'Deal number '||g, 'Brand', 'tech', 'Shop'||(g%30), 'online', 'https://example.com/'||g, 10 + (g%500),
       (random()*50)::int, (random()*10)::int, (random()*8)::int, (random() < 0.02), now() - (g || ' minutes')::interval
from generate_series(1,50000) g;
analyze public.deals; analyze public.profiles;
select t.as_anon();
\timing on
explain (analyze, buffers, costs off, summary on)
select * from public.deal_feed where is_hidden = false order by created_at desc limit 120;
\timing off
rollback;
