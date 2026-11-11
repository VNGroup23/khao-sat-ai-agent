-- Khảo sát GPCN · database schema and API on Supabase (Postgres 17).
-- Shares the Supabase project with the anniversary minigame. Safe to re-run.
--
-- Data lives in the "survey" schema, which the API does not expose and the public roles
-- cannot use. Pages only call the public.survey_* SECURITY DEFINER functions below.
--
-- NOTE: the minigame's schema.sql revokes execute on every function in public. If it is
-- re-run, re-run this file afterwards to restore the grants at the bottom.

create schema if not exists survey;
revoke all on schema survey from public, anon, authenticated;

-- ---- Tables -----------------------------------------------------------------------

create table if not exists survey.config (
  id int primary key default 1 check (id = 1),
  admin_key_hash text
);
insert into survey.config (id) values (1) on conflict do nothing;

-- One row per survey. Closing a survey makes new submissions fail with CLOSED.
create table if not exists survey.surveys (
  id text primary key,
  title text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
insert into survey.surveys (id, title)
values ('ai-agent-2026', 'Khảo Sát Thực Trạng Sử Dụng AI Agent')
on conflict do nothing;

-- One row per respondent (a random id kept in their browser). Sending again from the
-- same browser replaces the answers, so the latest submission is the one that counts.
create table if not exists survey.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references survey.surveys (id),
  respondent uuid not null,
  name text,
  unit text,
  dept text,
  role text,
  survey_date text,
  answers jsonb not null,
  user_agent text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submit_count int not null default 1,
  unique (survey_id, respondent)
);

alter table survey.config enable row level security;
alter table survey.surveys enable row level security;
alter table survey.responses enable row level security;
revoke all on all tables in schema survey from public, anon, authenticated;

-- ---- Helpers (not callable by the public roles) ---------------------------------------

create or replace function survey.admin_ok(p_key text) returns boolean
language sql stable security definer set search_path = survey, extensions as $$
  select coalesce((
    select admin_key_hash is not null and admin_key_hash = crypt(coalesce(p_key, ''), admin_key_hash)
    from survey.config where id = 1), false)
$$;

create or replace function survey.require_admin(p_key text) returns void
language plpgsql security definer set search_path = survey as $$
begin
  if not survey.admin_ok(p_key) then
    perform pg_sleep(1);
    raise exception 'FORBIDDEN';
  end if;
end $$;

-- Trimmed text, cut to a sane length; blank becomes null.
create or replace function survey.clean(p text, p_max int default 200) returns text
language sql immutable as $$
  select nullif(left(btrim(coalesce(p, '')), p_max), '')
$$;

revoke all on all functions in schema survey from public, anon, authenticated;

-- ---- Respondent API -------------------------------------------------------------------

create or replace function public.survey_status(p_survey text) returns json
language sql stable security definer set search_path = survey as $$
  select json_build_object(
    'exists', s.id is not null,
    'open', coalesce(s.is_open, false),
    'title', s.title)
  from (select 1) one left join survey.surveys s on s.id = p_survey
$$;

create or replace function public.survey_submit(
  p_survey text, p_respondent uuid, p_info jsonb, p_answers jsonb, p_user_agent text
) returns json
language plpgsql security definer set search_path = survey as $$
declare
  r survey.responses;
begin
  if p_respondent is null or jsonb_typeof(p_answers) is distinct from 'object'
     or jsonb_typeof(coalesce(p_info, '{}'::jsonb)) <> 'object' then
    raise exception 'BAD_INPUT';
  end if;
  if octet_length(p_answers::text) + octet_length(coalesce(p_info::text, '')) > 100000 then
    raise exception 'TOO_LARGE';
  end if;
  if not exists (select 1 from survey.surveys where id = p_survey and is_open) then
    raise exception 'CLOSED';
  end if;

  insert into survey.responses as t (survey_id, respondent, name, unit, dept, role, survey_date, answers, user_agent)
  values (
    p_survey, p_respondent,
    survey.clean(p_info ->> 'name'), survey.clean(p_info ->> 'unit'), survey.clean(p_info ->> 'dept'),
    survey.clean(p_info ->> 'role'), survey.clean(p_info ->> 'date', 10),
    p_answers, survey.clean(p_user_agent, 400))
  on conflict (survey_id, respondent) do update set
    name = excluded.name, unit = excluded.unit, dept = excluded.dept, role = excluded.role,
    survey_date = excluded.survey_date, answers = excluded.answers, user_agent = excluded.user_agent,
    updated_at = now(), submit_count = t.submit_count + 1
  returning * into r;

  return json_build_object('submittedAt', r.submitted_at, 'updatedAt', r.updated_at, 'count', r.submit_count);
end $$;

-- ---- GPCN admin API (every call needs the admin key) -----------------------------------

create or replace function public.survey_admin_check(p_key text) returns boolean
language plpgsql security definer set search_path = survey as $$
begin
  if survey.admin_ok(p_key) then return true; end if;
  perform pg_sleep(1);
  return false;
end $$;

create or replace function public.survey_admin_list(p_key text, p_survey text) returns json
language plpgsql security definer set search_path = survey as $$
begin
  perform survey.require_admin(p_key);
  return json_build_object(
    'survey', (select json_build_object('id', id, 'title', title, 'isOpen', is_open)
               from survey.surveys where id = p_survey),
    'responses', coalesce((
      select json_agg(json_build_object(
        'id', id, 'name', name, 'unit', unit, 'dept', dept, 'role', role, 'date', survey_date,
        'answers', answers, 'userAgent', user_agent, 'submittedAt', submitted_at,
        'updatedAt', updated_at, 'count', submit_count) order by updated_at desc)
      from survey.responses where survey_id = p_survey), '[]'::json));
end $$;

create or replace function public.survey_admin_set_open(p_key text, p_survey text, p_open boolean) returns boolean
language plpgsql security definer set search_path = survey as $$
begin
  perform survey.require_admin(p_key);
  update survey.surveys set is_open = p_open where id = p_survey;
  return p_open;
end $$;

create or replace function public.survey_admin_delete(p_key text, p_id uuid) returns void
language plpgsql security definer set search_path = survey as $$
begin
  perform survey.require_admin(p_key);
  delete from survey.responses where id = p_id;
end $$;

-- ---- Permissions --------------------------------------------------------------------

revoke all on function
  public.survey_status(text),
  public.survey_submit(text, uuid, jsonb, jsonb, text),
  public.survey_admin_check(text),
  public.survey_admin_list(text, text),
  public.survey_admin_set_open(text, text, boolean),
  public.survey_admin_delete(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.survey_status(text),
  public.survey_submit(text, uuid, jsonb, jsonb, text),
  public.survey_admin_check(text),
  public.survey_admin_list(text, text),
  public.survey_admin_set_open(text, text, boolean),
  public.survey_admin_delete(text, uuid)
to anon, authenticated;

notify pgrst, 'reload schema';
