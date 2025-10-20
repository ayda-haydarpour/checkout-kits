
-- === Tables ===
create table if not exists public.kits (
  kit_id text primary key,
  name text not null,
  category text,
  total_qty int not null default 0,
  image_url text,
  location text,
  description text,
  tags text,
  active boolean not null default true
);

create table if not exists public.loans (
  loan_id bigint generated always as identity primary key,
  kit_id text not null references public.kits(kit_id) on delete cascade,
  borrower_name text not null,
  borrower_email text not null,
  start_ts timestamptz not null default now(),
  due_ts timestamptz not null,
  returned_ts timestamptz,
  status text not null default 'OPEN' check (status in ('OPEN','RETURNED','OVERDUE'))
);

-- View with computed availability
create or replace view public.kits_with_avail as
select
  k.*,
  greatest(k.total_qty - coalesce(ol.open_count,0), 0)::int as available_qty
from public.kits k
left join (
  select kit_id, count(*)::int as open_count
  from public.loans
  where status = 'OPEN' and returned_ts is null
  group by kit_id
) ol on ol.kit_id = k.kit_id;

-- Optional seed data (update image_url paths to your site’s images)
insert into public.kits (kit_id, name, category, total_qty, image_url, location, description, tags, active) values
('KIT-00001','Woodburning Kit','woodworking',2,'/images/woodburning.jpg','Take and Create Stand','Woodburner techniques and project.','wood,art,crafts',true),
('KIT-00002','Vacuum Forming Pot','fabrication',3,'/images/vacuum-forming.jpg','Take and Create Stand','Vacuum forming a plant pot.','plastic,forming,pot',true),
('KIT-00003','Mancala Board','dremel',2,'/images/board.jpg','Take and Create Stand','Dremel sanding to finish a mancala board.','dremel,game,wood',true),
('KIT-00004','Pencil Pouch','sewing',4,'/images/sewing.jpg','Take and Create Stand','Sewing basics with a pouch.','sewing,fabric,crafts',true),
('KIT-00005','Leather Keychain','leatherwork',3,'/images/keychain.jpg','Take and Create Stand','Leather crafting a keychain.','leather,keychain,crafts',true)
on conflict (kit_id) do nothing;

-- === RLS ===
alter table public.kits enable row level security;
alter table public.loans enable row level security;

-- Only allow anon to read kits (+ view)
do $$ begin
  revoke all on table public.kits from anon;
  revoke all on table public.loans from anon;
  grant select on table public.kits to anon;
  grant select on table public.kits_with_avail to anon;
exception when others then null; end $$;

create policy if not exists "kits read for anon"
on public.kits for select to anon using (true);

-- No anon writes to loans; only Edge Function with service role writes.
