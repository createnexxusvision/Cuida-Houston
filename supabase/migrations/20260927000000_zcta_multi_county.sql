-- Flag ZCTAs that cross into a neighboring county, so the need page can say so.
alter table public.zcta_need add column if not exists multi_county boolean not null default false;
