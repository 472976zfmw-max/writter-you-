create extension if not exists "pgcrypto";

do $$ begin
  create type public.order_status as enum (
    'order_placed',
    'work_in_progress',
    'homework_completed',
    'out_for_delivery',
    'delivered'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  order_number text not null unique,
  customer_name text not null,
  mobile text not null,
  email text,
  address text not null,
  area text not null,
  pincode text not null,
  homework_text text,
  subject text,
  grade text,
  pages integer,
  colour text not null default 'Blue',
  handwriting_style text not null default 'Neat & clear',
  instructions text,
  status public.order_status not null default 'order_placed',
  writing_charge numeric(10,2) not null default 0,
  delivery_charge numeric(10,2) not null default 49,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 49,
  payment_status text not null default 'pending',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  page_price numeric(10,2) not null default 20,
  delivery_charge numeric(10,2) not null default 49,
  delivery_estimate text not null default '2–3 days',
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists delivery_estimate text not null default '2–3 days';

insert into public.site_settings (id, page_price, delivery_charge, delivery_estimate)
values (1, 20, 49, '2–3 days')
on conflict (id) do nothing;

create index if not exists orders_order_number_idx on public.orders(order_number);
create index if not exists orders_mobile_idx on public.orders(mobile);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists order_history_order_id_idx on public.order_history(order_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_files enable row level security;
alter table public.order_history enable row level security;

insert into storage.buckets (id, name, public)
values ('homework-files', 'homework-files', false)
on conflict (id) do nothing;
