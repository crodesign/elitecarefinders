-- Add columns for external reviews
alter table public.reviews
    add column source text default 'internal',
    add column source_link text,
    add column author_photo_url text,
    add column external_id text unique;

-- Create google_integrations table to store OAuth credentials and config
create table public.google_integrations (
    id uuid default gen_random_uuid() primary key,
    refresh_token text not null,
    account_id text, -- Google My Business Account ID
    location_id text, -- Google My Business Location ID
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on integrations
alter table public.google_integrations enable row level security;

-- Only admins can manage integrations
create policy "Integrations are viewable by admins only"
    on public.google_integrations for select
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Integrations are insertable by admins only"
    on public.google_integrations for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Integrations are updatable by admins only"
    on public.google_integrations for update
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Integrations are deletable by admins only"
    on public.google_integrations for delete
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );
