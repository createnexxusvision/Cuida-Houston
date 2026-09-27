-- Least-privilege role for the web app, plus bulk-write functions the pipeline calls with one JSON parameter
-- (the RDS Data API sends parameters as scalars, so arrays of rows travel as jsonb).

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'cuida_web') then
    create role cuida_web nologin;   -- login + password are set by `npm run db:migrate` from Secrets Manager
  end if;
end $$;

grant usage on schema public to cuida_web;
grant select on public.zcta_need, public.transit_stops, public.pathway_steps to cuida_web;
grant execute on function public.search_providers(char, double precision, double precision, integer, text, boolean, time, text, integer) to cuida_web;
-- Row-level security is on for every table, so reads also need a policy.
drop policy if exists web_read on public.zcta_need;
create policy web_read on public.zcta_need for select to cuida_web using (true);
drop policy if exists web_read on public.transit_stops;
create policy web_read on public.transit_stops for select to cuida_web using (true);
drop policy if exists web_read on public.pathway_steps;
create policy web_read on public.pathway_steps for select to cuida_web using (true);
-- No access to providers (raw addresses), provider_leads, partners, seat_reports, or any write function.

create or replace function public.upsert_zcta_need(payload jsonb)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into zcta_need (zcta, children_u6_working, capacity, seats_per_100, desert, pct_hispanic, pct_black,
    black_hispanic, black_hispanic_moe, multi_county, acs_vintage, computed_at)
  select r.zcta, r.children_u6_working, r.capacity, r.seats_per_100, r.desert, r.pct_hispanic, r.pct_black,
    r.black_hispanic, r.black_hispanic_moe, coalesce(r.multi_county, false), r.acs_vintage, coalesce(r.computed_at, now())
  from jsonb_to_recordset(payload) as r(zcta text, children_u6_working integer, capacity integer, seats_per_100 numeric,
    desert boolean, pct_hispanic numeric, pct_black numeric, black_hispanic integer, black_hispanic_moe integer,
    multi_county boolean, acs_vintage text, computed_at timestamptz)
  on conflict (zcta) do update set
    children_u6_working = excluded.children_u6_working, capacity = excluded.capacity,
    seats_per_100 = excluded.seats_per_100, desert = excluded.desert, pct_hispanic = excluded.pct_hispanic,
    pct_black = excluded.pct_black, black_hispanic = excluded.black_hispanic,
    black_hispanic_moe = excluded.black_hispanic_moe, multi_county = excluded.multi_county,
    acs_vintage = excluded.acs_vintage, computed_at = excluded.computed_at;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.upsert_zcta_centroids(payload jsonb)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into zcta_need (zcta, centroid_lat, centroid_lng)
  select r.zcta, r.centroid_lat, r.centroid_lng
  from jsonb_to_recordset(payload) as r(zcta text, centroid_lat double precision, centroid_lng double precision)
  on conflict (zcta) do update set centroid_lat = excluded.centroid_lat, centroid_lng = excluded.centroid_lng;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.upsert_transit_stops(payload jsonb)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into transit_stops (stop_id, name, lat, lng, routes)
  select r.stop_id, r.name, r.lat, r.lng, coalesce(r.routes, '{}')
  from jsonb_to_recordset(payload) as r(stop_id text, name text, lat double precision, lng double precision, routes text[])
  on conflict (stop_id) do update set name = excluded.name, lat = excluded.lat, lng = excluded.lng, routes = excluded.routes;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.mark_providers_inactive(ids jsonb)
returns integer language plpgsql as $$
declare n integer;
begin
  update providers set active = false
   where operation_id in (select jsonb_array_elements_text(ids)) and active;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.upsert_zcta_need(jsonb), public.upsert_zcta_centroids(jsonb),
  public.upsert_transit_stops(jsonb), public.mark_providers_inactive(jsonb) from public;
