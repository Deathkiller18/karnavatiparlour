-- Karnavati Parlour — Supabase schema
-- Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  category    text not null default '',
  unit        text not null default 'nang',
  cost_price  numeric(12,2) not null default 0 check (cost_price >= 0),
  sell_price  numeric(12,2) not null default 0 check (sell_price >= 0),
  stock       numeric(12,3) not null default 0,
  low_stock   numeric(12,3) not null default 5,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Maal aavyo (purchases / stock-in)
create table if not exists stock_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id   uuid not null references products (id) on delete cascade,
  product_name text not null,
  qty          numeric(12,3) not null check (qty > 0),
  cost_price   numeric(12,2) not null default 0 check (cost_price >= 0),
  total        numeric(14,2) not null default 0,
  entry_date   date not null default current_date,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

-- Vechan (one row per item sold; rows of one bill share bill_id)
create table if not exists sales (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bill_id      uuid not null,
  sale_date    date not null default current_date,
  product_id   uuid references products (id) on delete set null,
  product_name text not null,
  qty          numeric(12,3) not null check (qty > 0),
  sell_price   numeric(12,2) not null default 0,
  cost_price   numeric(12,2) not null default 0,
  total        numeric(14,2) not null default 0,
  profit       numeric(14,2) not null default 0,
  payment_mode text not null default 'cash' check (payment_mode in ('cash','upi','udhar')),
  note         text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exp_date   date not null default current_date,
  category   text not null default 'other',
  amount     numeric(12,2) not null check (amount > 0),
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists products_user_idx      on products (user_id, active);
create index if not exists stock_entries_user_idx on stock_entries (user_id, entry_date);
create index if not exists sales_user_idx         on sales (user_id, sale_date);
create index if not exists expenses_user_idx      on expenses (user_id, exp_date);

-- ---------- Stock stays correct automatically ----------
create or replace function kp_stock_entry_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update products
       set stock = stock + new.qty,
           cost_price = case when new.cost_price > 0 then new.cost_price else cost_price end
     where id = new.product_id;
    return new;
  else
    update products set stock = stock - old.qty where id = old.product_id;
    return old;
  end if;
end $$;

create or replace function kp_sale_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update products set stock = stock - new.qty where id = new.product_id;
    return new;
  else
    update products set stock = stock + old.qty where id = old.product_id;
    return old;
  end if;
end $$;

drop trigger if exists kp_stock_entry_trg on stock_entries;
create trigger kp_stock_entry_trg after insert or delete on stock_entries
  for each row execute function kp_stock_entry_change();

drop trigger if exists kp_sale_trg on sales;
create trigger kp_sale_trg after insert or delete on sales
  for each row execute function kp_sale_change();

-- ---------- Row Level Security: each login sees only its own shop ----------
alter table products      enable row level security;
alter table stock_entries enable row level security;
alter table sales         enable row level security;
alter table expenses      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['products','stock_entries','sales','expenses'] loop
    execute format('drop policy if exists kp_owner on %I', t);
    execute format(
      'create policy kp_owner on %I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
