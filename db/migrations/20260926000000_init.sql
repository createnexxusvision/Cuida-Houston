-- Cuida HOU initial schema. Aurora PostgreSQL 16 (or any Postgres 15+) with PostGIS.
create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Providers: one row per state-licensed day-care operation (HHSC operation_id)
-- ---------------------------------------------------------------------------
create table if not exists public.providers (
  operation_id           text primary key,
  name                   text not null,
  operation_type         text not null,
  is_home                boolean not null default false,
  address_line           text,
  city                   text,
  zip5                   char(5),
  lat                    double precision,
  lng                    double precision,
  public_lat             double precision,           -- rounded (~500 m) for home providers
  public_lng             double precision,
  location_precision     text not null default 'zip' check (location_precision in ('exact','approx','zip')),
  tract_geoid            char(11),
  geom                   geography(point, 4326) generated always as (
                           case when lng is not null and lat is not null
                           then st_setsrid(st_makepoint(lng, lat), 4326)::geography end) stored,
  public_geom            geography(point, 4326) generated always as (
                           case when public_lng is not null and public_lat is not null
                           then st_setsrid(st_makepoint(public_lng, public_lat), 4326)::geography end) stored,
  capacity               integer,
  ages                   text[] not null default '{}',
  accepts_subsidy        boolean not null default false,
  trs_level              text,                         -- Texas Rising Star, from TWC report (P1)
  open_time              time,
  close_time             time,
  days                   text[] not null default '{}',
  deficiency_high        integer not null default 0,
  deficiency_medium_high integer not null default 0,
  corrective_action      boolean not null default false,
  adverse_action         boolean not null default false,
  temporarily_closed     boolean not null default false,
  phone                  text,
  active                 boolean not null default true,
  row_hash               text not null,
  synced_at              timestamptz not null default now()
);
create index if not exists providers_public_geom_idx on public.providers using gist (public_geom);
create index if not exists providers_zip_idx on public.providers (zip5) where active;

-- ---------------------------------------------------------------------------
-- Need by ZIP Code Tabulation Area
-- ---------------------------------------------------------------------------
create table if not exists public.zcta_need (
  zcta                char(5) primary key,
  children_u6_working integer,
  capacity            integer,
  seats_per_100       numeric,
  desert              boolean,
  pct_hispanic        numeric,
  pct_black           numeric,
  black_hispanic      integer,
  black_hispanic_moe  integer,
  svi                 numeric,
  centroid_lat        double precision,
  centroid_lng        double precision,
  acs_vintage         text,
  computed_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Transit
-- ---------------------------------------------------------------------------
create table if not exists public.transit_stops (
  stop_id text primary key,
  name    text not null,
  lat     double precision not null,
  lng     double precision not null,
  geom    geography(point, 4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  routes  text[] not null default '{}'
);
create index if not exists transit_stops_geom_idx on public.transit_stops using gist (geom);

-- ---------------------------------------------------------------------------
-- Provider pathway content (bilingual), each step tied to an official source
-- ---------------------------------------------------------------------------
create table if not exists public.pathway_steps (
  id          serial primary key,
  permit_type text not null check (permit_type in ('listed','registered','licensed_home')),
  step_order  integer not null,
  title_en    text not null,
  title_es    text not null,
  body_en     text not null,
  body_es     text not null,
  source_url  text not null,
  verified_on date,                 -- null = not yet verified; UI must show "unverified"
  reviewer    text,
  unique (permit_type, step_order)
);

-- ---------------------------------------------------------------------------
-- P1: provider interest leads (PII). No public access. Contact encrypted by the app server.
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  zctas char(5)[] not null default '{}'
);

create table if not exists public.provider_leads (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  zcta                 char(5) not null,
  language             text not null check (language in ('en','es')),
  contact_method       text not null check (contact_method in ('sms','phone','email','whatsapp')),
  contact_enc          bytea not null,
  consent_text_version text not null,
  consent_at           timestamptz not null,
  partner_id           uuid references public.partners(id),
  status               text not null default 'new' check (status in ('new','contacted','in_progress','licensed','closed')),
  deleted_at           timestamptz
);

create table if not exists public.seat_reports (          -- P1
  id           bigserial primary key,
  operation_id text not null references public.providers(operation_id),
  age_group    text not null,
  open_seats   integer not null check (open_seats >= 0),
  source       text not null check (source in ('twc','partner','provider')),
  reported_at  timestamptz not null default now(),
  verified     boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Row-level security on, with no policies: only the table owner (the pipeline) reads or writes tables directly.
-- The web app reads through search_providers() and granted reference tables (see roles migration).
-- ---------------------------------------------------------------------------
alter table public.providers      enable row level security;
alter table public.zcta_need      enable row level security;
alter table public.transit_stops  enable row level security;
alter table public.pathway_steps  enable row level security;
alter table public.partners       enable row level security;
alter table public.provider_leads enable row level security;
alter table public.seat_reports   enable row level security;

-- Access for the web app is granted to the cuida_web role in a later migration.

-- ---------------------------------------------------------------------------
-- Search: returns only public-safe columns. Home providers never expose street address or exact point.
-- ---------------------------------------------------------------------------
create or replace function public.search_providers(
  p_zip        char(5) default null,
  p_lat        double precision default null,
  p_lng        double precision default null,
  p_radius_m   integer default 5000,
  p_age        text default null,          -- 'Infant' | 'Toddler' | 'Pre-Kindergarten' | 'School'
  p_subsidy    boolean default null,
  p_opens_by   time default null,
  p_day        text default null,          -- 'Mon'..'Sun'
  p_limit      integer default 50
) returns table (
  operation_id text, name text, operation_type text, is_home boolean,
  address_line text, zip5 char(5), lat double precision, lng double precision, location_precision text,
  capacity integer, ages text[], accepts_subsidy boolean, open_time time, close_time time, days text[],
  deficiency_high integer, deficiency_medium_high integer, corrective_action boolean, adverse_action boolean,
  phone text, distance_m integer, nearby_routes text[]
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (
    select coalesce(
      case when p_lat is not null and p_lng is not null
           then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
      (select st_setsrid(st_makepoint(z.centroid_lng, z.centroid_lat), 4326)::geography
         from zcta_need z where z.zcta = p_zip and z.centroid_lat is not null)
    ) as g
  )
  select p.operation_id, p.name, p.operation_type, p.is_home,
         case when p.is_home then null else p.address_line end,
         p.zip5, p.public_lat, p.public_lng, p.location_precision,
         p.capacity, p.ages, p.accepts_subsidy, p.open_time, p.close_time, p.days,
         p.deficiency_high, p.deficiency_medium_high, p.corrective_action, p.adverse_action,
         p.phone,
         case when o.g is not null and p.public_geom is not null then round(st_distance(o.g, p.public_geom))::int end,
         (select array(select distinct unnest(s.routes) order by 1)
            from transit_stops s
           where p.public_geom is not null and st_dwithin(s.geom, p.public_geom, 800))
    from providers p cross join origin o
   where p.active and not p.temporarily_closed
     and (o.g is null and p.zip5 = p_zip
          or o.g is not null and p.public_geom is not null and st_dwithin(p.public_geom, o.g, p_radius_m)
          or o.g is null and p_zip is null)
     and (p_age is null or p_age = any(p.ages))
     and (p_subsidy is null or p.accepts_subsidy = p_subsidy)
     and (p_opens_by is null or (p.open_time is not null and p.open_time <= p_opens_by))
     and (p_day is null or p_day = any(p.days))
   order by 21 nulls last, p.name
   limit least(greatest(p_limit, 1), 200);
$$;

-- ETL upsert (service role only).
create or replace function public.upsert_providers(payload jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  insert into providers (operation_id, name, operation_type, is_home, address_line, city, zip5, lat, lng,
    public_lat, public_lng, location_precision, tract_geoid, capacity, ages, accepts_subsidy, open_time, close_time,
    days, deficiency_high, deficiency_medium_high, corrective_action, adverse_action, temporarily_closed, phone,
    active, row_hash, synced_at)
  select r.operation_id, r.name, r.operation_type, r.is_home, r.address_line, r.city, r.zip5, r.lat, r.lng,
    r.public_lat, r.public_lng, r.location_precision, r.tract_geoid, r.capacity, coalesce(r.ages,'{}'), r.accepts_subsidy,
    r.open_time::time, r.close_time::time, coalesce(r.days,'{}'), r.deficiency_high, r.deficiency_medium_high,
    r.corrective_action, r.adverse_action, r.temporarily_closed, r.phone, true, r.row_hash, coalesce(r.synced_at, now())
  from jsonb_to_recordset(payload) as r(operation_id text, name text, operation_type text, is_home boolean,
    address_line text, city text, zip5 text, lat double precision, lng double precision, public_lat double precision,
    public_lng double precision, location_precision text, tract_geoid text, capacity integer, ages text[],
    accepts_subsidy boolean, open_time text, close_time text, days text[], deficiency_high integer,
    deficiency_medium_high integer, corrective_action boolean, adverse_action boolean, temporarily_closed boolean,
    phone text, row_hash text, synced_at timestamptz)
  on conflict (operation_id) do update set
    name = excluded.name, operation_type = excluded.operation_type, is_home = excluded.is_home,
    address_line = excluded.address_line, city = excluded.city, zip5 = excluded.zip5,
    lat = excluded.lat, lng = excluded.lng, public_lat = excluded.public_lat, public_lng = excluded.public_lng,
    location_precision = excluded.location_precision, tract_geoid = excluded.tract_geoid,
    capacity = excluded.capacity, ages = excluded.ages, accepts_subsidy = excluded.accepts_subsidy,
    open_time = excluded.open_time, close_time = excluded.close_time, days = excluded.days,
    deficiency_high = excluded.deficiency_high, deficiency_medium_high = excluded.deficiency_medium_high,
    corrective_action = excluded.corrective_action, adverse_action = excluded.adverse_action,
    temporarily_closed = excluded.temporarily_closed, phone = excluded.phone, active = true,
    row_hash = excluded.row_hash, synced_at = excluded.synced_at;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.upsert_providers(jsonb) from public;
revoke all on function public.search_providers(char, double precision, double precision, integer, text, boolean, time, text, integer) from public;
