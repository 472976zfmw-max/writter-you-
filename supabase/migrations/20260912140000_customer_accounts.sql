alter table public.orders
  add column if not exists customer_id uuid references auth.users(id) on delete cascade;

create index if not exists orders_customer_id_idx on public.orders(customer_id);
