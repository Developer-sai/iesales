\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;

create schema if not exists t;
grant usage on schema t to anon, authenticated;

create or replace function t.as_super() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', true); end $$;
create or replace function t.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, true); set local role authenticated; end $$;
create or replace function t.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', true); set local role anon; end $$;
create or replace function t.expect_error(stmt text, label text) returns void language plpgsql as $$
declare failed boolean := false; begin
  begin execute stmt; exception when others then failed := true; end;
  if not failed then raise exception 'FAIL (expected an error but it succeeded): %', label; end if;
  raise notice 'PASS  %', label; end $$;
create or replace function t.expect_ok(stmt text, label text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise exception 'FAIL (unexpected error "%"): %', sqlerrm, label; end;
  raise notice 'PASS  %', label; end $$;
create or replace function t.check(cond boolean, label text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS  %', label; end $$;

begin;
-- fixtures (as superuser)
insert into auth.users (id, email) values
 ('a0000000-0000-0000-0000-000000000001','alice@x.ie'),
 ('b0000000-0000-0000-0000-000000000002','bob@x.ie'),
 ('c0000000-0000-0000-0000-000000000003','carol@x.ie'),
 ('d0000000-0000-0000-0000-000000000004','mod@x.ie'),
 ('e0000000-0000-0000-0000-000000000005','ratelimit@x.ie'),
 ('f1000000-0000-0000-0000-000000000001','flag1@x.ie'),('f2000000-0000-0000-0000-000000000002','flag2@x.ie'),
 ('f3000000-0000-0000-0000-000000000003','flag3@x.ie'),('f4000000-0000-0000-0000-000000000004','flag4@x.ie'),
 ('f5000000-0000-0000-0000-000000000005','flag5@x.ie'),
 ('90000000-0000-0000-0000-000000000001','new1@x.ie'),('90000000-0000-0000-0000-000000000002','new2@x.ie'),
 ('90000000-0000-0000-0000-000000000003','new3@x.ie'),('90000000-0000-0000-0000-000000000004','new4@x.ie'),
 ('90000000-0000-0000-0000-000000000005','new5@x.ie');
-- everyone except the "new" accounts is an established account (> 1h old)
update public.profiles set created_at = now() - interval '2 hours' where id::text not like '90000000%';
insert into public.moderators (user_id) values ('d0000000-0000-0000-0000-000000000004');

select t.check((select count(*) from public.profiles) = 15, 'trigger created a profile for every new auth user');
select t.check((select username from public.profiles where id = 'a0000000-0000-0000-0000-000000000001') like 'Shopper\_%', 'default handle is Shopper_xxxxx');

-- ===== deals: valid insert + hardening =====
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_ok($$insert into public.deals (id,title,brand,category,retailer,location_type,deal_url,sale_price,prior_price,prior_evidence_url)
  values ('de000000-0000-0000-0000-000000000001','Test TV 55','Acme','tech','ShopA','online','https://example.com/tv',299,399,'https://example.com/history')$$, 'alice posts a valid online deal with evidence');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,legit_votes) values ('x y z','A','tech','S','online','https://e.com/a',5,999)$$, 'cannot insert pre-set legit_votes (column privilege)');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,is_hidden) values ('x y z','A','tech','S','online','https://e.com/a',5,true)$$, 'cannot insert is_hidden');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,photo_approved) values ('x y z','A','tech','S','online','https://e.com/a',5,true)$$, 'cannot self-approve a photo');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,user_id) values ('x y z','A','tech','S','online','https://e.com/a',5,'b0000000-0000-0000-0000-000000000002')$$, 'cannot post as another user_id');
select t.expect_error($$update public.deals set legit_votes = 500 where id = 'de000000-0000-0000-0000-000000000001'$$, 'owner cannot edit legit_votes');
select t.expect_error($$update public.deals set is_hidden = false where id = 'de000000-0000-0000-0000-000000000001'$$, 'owner cannot touch is_hidden');
select t.expect_error($$update public.deals set sale_price = 1 where id = 'de000000-0000-0000-0000-000000000001'$$, 'owner cannot change the price after posting');
select t.expect_ok($$update public.deals set note = 'Stock looks good' where id = 'de000000-0000-0000-0000-000000000001'$$, 'owner can edit note');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price) values ('x y z','A','tech','S','online','http://insecure.com/a',5)$$, 'http:// deal link rejected');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price) values ('x y z','A','tech','S','online','javascript:alert(1)',5)$$, 'javascript: link rejected');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,prior_price,prior_evidence_url) values ('x y z','A','tech','S','online','https://e.com/a',50,40,'https://e.com/h')$$, 'prior price must exceed sale price');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price,prior_price) values ('x y z','A','tech','S','online','https://e.com/a',40,50)$$, 'prior price without evidence rejected');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,sale_price) values ('x y z','A','tech','S','online',5)$$, 'online deal without link rejected');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,sale_price) values ('x y z','A','tech','S','in-store',5)$$, 'in-store deal without county rejected');
select t.expect_ok($$insert into public.deals (id,title,brand,category,retailer,location_type,county,store_branch,sale_price) values ('de000000-0000-0000-0000-000000000002','Winter coat','A','fashion','ShopB','in-store','Kildare','Kildare Village',60)$$, 'valid in-store deal');
select t.expect_error($$insert into public.deals (id,title,brand,category,retailer,location_type,county,sale_price) values ('de000000-0000-0000-0000-000000000001','dup id','A','fashion','ShopB','in-store','Dublin',60)$$, 'retried submit with same client id cannot create a duplicate (idempotency)');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,county,sale_price) values ('x y z','A','hacking','S','in-store','Dublin',5)$$, 'unknown category rejected');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,county,sale_price) values ('x y z','A','tech','S','in-store','Dublin',-5)$$, 'negative price rejected');

select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$update public.deals set note = 'hijack' where id = 'de000000-0000-0000-0000-000000000001'$$, 'bob update statement runs (RLS filters rows)');
select t.as_super();
select t.check((select note from public.deals where id = 'de000000-0000-0000-0000-000000000001') = 'Stock looks good', 'bob could not modify alice''s deal');
select t.as_user('b0000000-0000-0000-0000-000000000002');
delete from public.deals where id = 'de000000-0000-0000-0000-000000000001';
select t.as_super();
select t.check((select count(*) from public.deals where id = 'de000000-0000-0000-0000-000000000001') = 1, 'bob could not delete alice''s deal');

-- ===== anon access =====
select t.as_anon();
select t.check((select count(*) from public.deal_feed) = 2, 'anonymous visitors can browse the feed');
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price) values ('x y z','A','tech','S','online','https://e.com/a',5)$$, 'anonymous cannot post');
select t.expect_error($$insert into public.comments (deal_id, body) values ('de000000-0000-0000-0000-000000000001','hi')$$, 'anonymous cannot comment');
select t.expect_error($$select count(*) from public.deal_votes$$, 'anonymous cannot read votes');
select t.expect_error($$select count(*) from public.post_flags$$, 'anonymous cannot read flags');
select t.expect_error($$select count(*) from public.moderators$$, 'moderator list is not readable');
select t.expect_error($$select public.delete_my_account()$$, 'anonymous cannot call delete_my_account');
select t.expect_error($$select public.moderate_content('deal','de000000-0000-0000-0000-000000000001',true,'x')$$, 'anonymous cannot moderate');

-- ===== votes (counters maintained server-side) =====
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$insert into public.deal_votes (deal_id, vote_type) values ('de000000-0000-0000-0000-000000000001','legit')$$, 'bob votes legit');
select t.as_super();
select t.check((select legit_votes from public.deals where id = 'de000000-0000-0000-0000-000000000001') = 1, 'legit_votes counter = 1');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$insert into public.deal_votes (deal_id, vote_type) values ('de000000-0000-0000-0000-000000000001','fake')$$, 'cannot vote twice on one deal');
select t.expect_ok($$update public.deal_votes set vote_type = 'fake' where deal_id = 'de000000-0000-0000-0000-000000000001'$$, 'bob changes vote to fake');
select t.as_super();
select t.check((select legit_votes = 0 and fake_votes = 1 from public.deals where id = 'de000000-0000-0000-0000-000000000001'), 'counters moved legit->fake');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$insert into public.deal_votes (deal_id, vote_type, user_id) values ('de000000-0000-0000-0000-000000000002','legit','c0000000-0000-0000-0000-000000000003')$$, 'cannot cast a vote as someone else');
select t.expect_error($$insert into public.deal_votes (deal_id, vote_type) values ('de000000-0000-0000-0000-000000000002','amazing')$$, 'invalid vote type rejected');
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.check((select count(*) from public.deal_votes) = 0, 'carol cannot see bob''s vote');
select t.as_user('b0000000-0000-0000-0000-000000000002');
delete from public.deal_votes where deal_id = 'de000000-0000-0000-0000-000000000001';
select t.as_super();
select t.check((select legit_votes = 0 and fake_votes = 0 from public.deals where id = 'de000000-0000-0000-0000-000000000001'), 'removing a vote decrements the counter');

-- ===== comments + denormalised counter =====
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$insert into public.comments (deal_id, body) values ('de000000-0000-0000-0000-000000000001','Price history matches')$$, 'bob comments');
select t.as_super();
update public.comments set id = 'c1000000-0000-0000-0000-000000000001' where deal_id = 'de000000-0000-0000-0000-000000000001';
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$insert into public.comments (deal_id, body) values ('de000000-0000-0000-0000-000000000001', repeat('x', 501))$$, 'comment length capped at 500');
select t.expect_error($$update public.comments set body = 'edited' where id = 'c1000000-0000-0000-0000-000000000001'$$, 'comments cannot be edited after posting');
select t.as_super();
select t.check((select comment_count from public.deals where id = 'de000000-0000-0000-0000-000000000001') = 1, 'comment_count counter = 1');

-- ===== moderation: flags =====
-- 4 established flaggers: not yet hidden
select t.as_user('f1000000-0000-0000-0000-000000000001'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','misleading');
select t.as_user('f2000000-0000-0000-0000-000000000002'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','misleading');
select t.as_user('f3000000-0000-0000-0000-000000000003'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','spam');
select t.as_user('f4000000-0000-0000-0000-000000000004'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','spam');
select t.expect_error($$insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','spam')$$, 'same user cannot flag the same post twice');
select t.as_super();
select t.check((select is_hidden = false and flag_count = 4 from public.deals where id = 'de000000-0000-0000-0000-000000000002'), '4 flags: still visible, count = 4');
select t.as_user('f5000000-0000-0000-0000-000000000005'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000002','illegal');
select t.as_super();
select t.check((select is_hidden and flag_count = 5 and moderation_reason like 'Hidden automatically%' from public.deals where id = 'de000000-0000-0000-0000-000000000002'), '5th flag auto-hides the deal with a stated reason');
select t.as_anon();
select t.check((select count(*) from public.deal_feed where id = 'de000000-0000-0000-0000-000000000002') = 0, 'hidden deal is invisible to the public');
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.check((select count(*) from public.deal_feed where id = 'de000000-0000-0000-0000-000000000002') = 1, 'owner can still see (and read the reason for) their hidden deal');
select t.expect_error($$update public.deals set is_hidden = false where id = 'de000000-0000-0000-0000-000000000002'$$, 'owner cannot un-hide their own deal');
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.check((select count(*) from public.post_flags) = 0, 'reporters are private: carol sees none of the flags');
select t.as_user('f1000000-0000-0000-0000-000000000001');
select t.check((select count(*) from public.post_flags) = 1, 'a reporter sees only their own flag');

-- brigading: 5 brand-new accounts have no effect
select t.as_user('90000000-0000-0000-0000-000000000001'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000001','spam');
select t.as_user('90000000-0000-0000-0000-000000000002'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000001','spam');
select t.as_user('90000000-0000-0000-0000-000000000003'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000001','spam');
select t.as_user('90000000-0000-0000-0000-000000000004'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000001','spam');
select t.as_user('90000000-0000-0000-0000-000000000005'); insert into public.post_flags (target_type,target_id,reason) values ('deal','de000000-0000-0000-0000-000000000001','spam');
select t.as_super();
select t.check((select is_hidden = false and flag_count = 0 from public.deals where id = 'de000000-0000-0000-0000-000000000001'), '5 flags from brand-new accounts do NOT hide a deal (anti-brigading)');

-- moderator workflow
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_error($$select public.moderate_content('deal','de000000-0000-0000-0000-000000000002',false,null)$$, 'normal user cannot call moderate_content');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.check((select count(*) from public.deals where id = 'de000000-0000-0000-0000-000000000002') = 1, 'moderator can see hidden content');
select t.expect_ok($$select public.moderate_content('deal','de000000-0000-0000-0000-000000000002',false,null)$$, 'moderator restores the deal');
select t.as_super();
select t.check((select is_hidden = false and flag_count = 0 from public.deals where id = 'de000000-0000-0000-0000-000000000002'), 'restored deal: visible and flags reset');
select t.check((select count(*) from public.post_flags where target_id = 'de000000-0000-0000-0000-000000000002') = 0, 'old flags cleared so it is not instantly re-hidden');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.expect_ok($$select public.moderate_content('deal','de000000-0000-0000-0000-000000000002',true,'Price could not be verified')$$, 'moderator hides with a reason');
select t.as_super();
select t.check((select moderation_reason from public.deals where id = 'de000000-0000-0000-0000-000000000002') = 'Price could not be verified', 'author-visible reason stored');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.expect_ok($$select public.moderate_content('deal','de000000-0000-0000-0000-000000000002',false,null)$$, 'moderator restores again');

-- flagging a comment hides the comment and fixes the counter
select t.as_user('f1000000-0000-0000-0000-000000000001'); insert into public.post_flags (target_type,target_id,reason) values ('comment','c1000000-0000-0000-0000-000000000001','spam');
select t.as_user('f2000000-0000-0000-0000-000000000002'); insert into public.post_flags (target_type,target_id,reason) values ('comment','c1000000-0000-0000-0000-000000000001','spam');
select t.as_user('f3000000-0000-0000-0000-000000000003'); insert into public.post_flags (target_type,target_id,reason) values ('comment','c1000000-0000-0000-0000-000000000001','spam');
select t.as_user('f4000000-0000-0000-0000-000000000004'); insert into public.post_flags (target_type,target_id,reason) values ('comment','c1000000-0000-0000-0000-000000000001','spam');
select t.as_user('f5000000-0000-0000-0000-000000000005'); insert into public.post_flags (target_type,target_id,reason) values ('comment','c1000000-0000-0000-0000-000000000001','spam');
select t.as_super();
select t.check((select is_hidden from public.comments where id = 'c1000000-0000-0000-0000-000000000001'), '5 flags hide a comment');
select t.check((select comment_count from public.deals where id = 'de000000-0000-0000-0000-000000000001') = 0, 'hidden comment no longer counted');

-- ===== polls =====
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_ok($$insert into public.polls (question, options) values ('Best shop for TVs?','["ShopA","ShopB"]')$$, 'alice creates a poll');
select t.as_super();
update public.polls set id = 'b0110000-0000-0000-0000-000000000001' where question = 'Best shop for TVs?';
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_error($$insert into public.polls (question, options, is_pinned) values ('Pin me please?','["a","b"]', true)$$, 'users cannot pin their own polls');
select t.expect_error($$insert into public.polls (question, options) values ('Only one option?','["a"]')$$, 'poll needs 2+ options');
select t.expect_error($$insert into public.polls (question, options) values ('Too many options?','["a","b","c","d","e","f","g"]')$$, 'poll max 6 options');
select t.expect_error($$insert into public.polls (question, options) values ('Not strings?','[1,2]')$$, 'poll options must be strings');
select t.as_super();
select t.check((select option_counts = '[0,0]'::jsonb and is_pinned = false from public.polls where id = 'b0110000-0000-0000-0000-000000000001'), 'poll counts initialised to zero, unpinned');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$insert into public.poll_votes (poll_id, option_index) values ('b0110000-0000-0000-0000-000000000001', 1)$$, 'bob votes in poll');
select t.expect_error($$insert into public.poll_votes (poll_id, option_index) values ('b0110000-0000-0000-0000-000000000001', 0)$$, 'one vote per poll');
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.expect_error($$insert into public.poll_votes (poll_id, option_index) values ('b0110000-0000-0000-0000-000000000001', 5)$$, 'out-of-range option rejected');
select t.expect_error($$update public.polls set option_counts = '[99,0]' where id = 'b0110000-0000-0000-0000-000000000001'$$, 'cannot tamper with poll counts');
select t.as_super();
select t.check((select option_counts = '[0,1]'::jsonb from public.polls where id = 'b0110000-0000-0000-0000-000000000001'), 'poll counts = [0,1]');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$select public.set_poll_pinned('b0110000-0000-0000-0000-000000000001', true)$$, 'normal users cannot pin polls');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.expect_ok($$select public.set_poll_pinned('b0110000-0000-0000-0000-000000000001', true)$$, 'moderator pins a poll');
select t.as_super();
select t.check((select is_pinned from public.polls where id = 'b0110000-0000-0000-0000-000000000001'), 'poll is pinned');

-- ===== discussions =====
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$insert into public.discussions (county, question) values ('Kildare','Is the queue long at Kildare Village?')$$, 'bob asks a question');
select t.as_super();
update public.discussions set id = 'd1500000-0000-0000-0000-000000000001' where county = 'Kildare';
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.expect_ok($$insert into public.discussion_replies (discussion_id, body) values ('d1500000-0000-0000-0000-000000000001','About 10 minutes')$$, 'carol replies');

-- ===== takedown notices =====
select t.as_anon();
select t.expect_ok($$insert into public.takedown_notices (notifier_email, target_url, explanation, good_faith) values ('who@x.ie','https://iesales.ie/deal/abc','This post shows my home address and phone number.', true)$$, 'anyone can submit a DSA notice');
select t.expect_error($$insert into public.takedown_notices (notifier_email, target_url, explanation, good_faith) values ('who@x.ie','https://iesales.ie/deal/abc','This post shows my home address and phone number.', false)$$, 'notice requires good-faith confirmation');
select t.expect_error($$insert into public.takedown_notices (notifier_email, target_url, explanation, good_faith) values ('not-an-email','https://iesales.ie/deal/abc','This post shows my home address and phone number.', true)$$, 'notice requires a plausible email');
select t.expect_error($$select * from public.takedown_notices$$, 'anonymous cannot read notices');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.check((select count(*) from public.takedown_notices) = 0, 'normal users see no notices');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.check((select count(*) from public.takedown_notices) = 1, 'moderators see notices');

-- ===== profiles =====
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_ok($$update public.profiles set username = 'Bob_Dublin' where id = 'b0000000-0000-0000-0000-000000000002'$$, 'user changes own username');
select t.expect_error($$update public.profiles set username = 'bad name!' where id = 'b0000000-0000-0000-0000-000000000002'$$, 'invalid username rejected');
select t.expect_ok($$update public.profiles set username = 'Hijacked' where id = 'c0000000-0000-0000-0000-000000000003'$$, 'bob attempts to rename carol (statement runs, RLS filters it)');
select t.as_super();
select t.check((select username <> 'Hijacked' from public.profiles where id = 'c0000000-0000-0000-0000-000000000003'), 'carol was not renamed');
select t.as_user('c0000000-0000-0000-0000-000000000003');
select t.expect_error($$update public.profiles set username = 'Bob_Dublin' where id = 'c0000000-0000-0000-0000-000000000003'$$, 'usernames are unique');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$update public.profiles set created_at = now() where id = 'b0000000-0000-0000-0000-000000000002'$$, 'cannot reset account age to dodge trust checks');
select t.expect_error($$insert into public.profiles (id, username) values (gen_random_uuid(), 'FakeUser')$$, 'cannot create profiles directly');
select t.expect_error($$select public.recount_deal_votes()$$, 'trigger functions are not callable by users');
select t.expect_error($$insert into public.moderators (user_id) values ('b0000000-0000-0000-0000-000000000002')$$, 'cannot make yourself a moderator');

-- ===== deal_feed view: photo gating + editor badge =====
select t.as_user('90000000-0000-0000-0000-000000000001');
select t.expect_ok($$insert into public.deals (id,title,brand,category,retailer,location_type,county,sale_price,image_path) values ('de000000-0000-0000-0000-000000000009','Photo deal','A','tech','S','in-store','Dublin',10,'90000000-0000-0000-0000-000000000001/a.jpg')$$, 'new account posts a deal with a photo');
select t.as_anon();
select t.check((select image_path is null from public.deal_feed where id = 'de000000-0000-0000-0000-000000000009'), 'photo withheld while the account is under 1 hour old');
select t.as_user('b0000000-0000-0000-0000-000000000002');
select t.expect_error($$select public.set_photo_approved('de000000-0000-0000-0000-000000000009', true)$$, 'normal users cannot approve photos');
select t.as_user('d0000000-0000-0000-0000-000000000004');
select t.expect_ok($$select public.set_photo_approved('de000000-0000-0000-0000-000000000009', true)$$, 'moderator approves photo');
select t.as_anon();
select t.check((select image_path is not null from public.deal_feed where id = 'de000000-0000-0000-0000-000000000009'), 'approved photo becomes visible');
select t.as_user('d0000000-0000-0000-0000-000000000004');
insert into public.deals (id,title,brand,category,retailer,location_type,deal_url,sale_price) values ('de000000-0000-0000-0000-000000000010','Editor seeded','A','tech','S','online','https://e.com/ed',10);
select t.as_anon();
select t.check((select is_editor from public.deal_feed where id = 'de000000-0000-0000-0000-000000000010'), 'editor-seeded deals carry the public Editor badge');
select t.check((select not is_editor from public.deal_feed where id = 'de000000-0000-0000-0000-000000000001'), 'normal users do not');

-- ===== storage policies =====
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_ok($$insert into storage.objects (bucket_id, name) values ('deal-photos','a0000000-0000-0000-0000-000000000001/p1.jpg')$$, 'user uploads into their own folder');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('deal-photos','b0000000-0000-0000-0000-000000000002/evil.jpg')$$, 'user cannot upload into someone else''s folder');
select t.expect_error($$insert into storage.objects (bucket_id, name) values ('other-bucket','a0000000-0000-0000-0000-000000000001/p1.jpg')$$, 'upload outside the deal-photos bucket is not allowed by policy');

-- ===== rate limit =====
select t.as_user('e0000000-0000-0000-0000-000000000005');
select t.expect_ok(format($f$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price) values ('Spam deal %s','A','tech','S','online','https://e.com/%s',5)$f$, g, g), 'rate limit: deal #' || g || ' of 8 allowed') from generate_series(1, 8) g;
select t.expect_error($$insert into public.deals (title,brand,category,retailer,location_type,deal_url,sale_price) values ('Spam deal 9','A','tech','S','online','https://e.com/9',5)$$, 'rate limit: 9th deal in an hour is blocked');

-- ===== account deletion cascades =====
select t.as_user('a0000000-0000-0000-0000-000000000001');
select t.expect_ok($$select public.delete_my_account()$$, 'alice deletes her account');
select t.as_super();
select t.check((select count(*) from auth.users where id = 'a0000000-0000-0000-0000-000000000001') = 0, 'auth user removed');
select t.check((select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-000000000001') = 0, 'profile removed');
select t.check((select count(*) from public.deals where user_id = 'a0000000-0000-0000-0000-000000000001') = 0, 'her deals removed');
select t.check((select count(*) from public.comments where deal_id = 'de000000-0000-0000-0000-000000000001') = 0, 'comments on her deals removed');
select t.check((select count(*) from public.polls where user_id = 'a0000000-0000-0000-0000-000000000001') = 0, 'her polls removed (and poll votes cascade)');
select t.check((select count(*) from public.poll_votes) = 0, 'votes on her poll removed');
rollback;
\echo
\echo ALL SECURITY TESTS PASSED
