create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  organization_name text not null,
  country text,
  organization_type text,
  annual_attendees text,
  message text,
  referral_source text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint demo_requests_email_not_blank check (length(trim(email)) > 0),
  constraint demo_requests_first_name_not_blank check (length(trim(first_name)) > 0),
  constraint demo_requests_last_name_not_blank check (length(trim(last_name)) > 0),
  constraint demo_requests_organization_not_blank check (
    length(trim(organization_name)) > 0
  ),
  constraint demo_requests_status_valid check (
    status in ('new', 'contacted', 'qualified', 'closed')
  )
);

create index demo_requests_status_created_at_idx
  on public.demo_requests (status, created_at desc);

-- RLS deny-by-default: las inserciones se hacen con service role desde la
-- server action y no se expone la tabla a anon ni authenticated. La lectura
-- queda para herramientas internas en una fase posterior.
alter table public.demo_requests enable row level security;
