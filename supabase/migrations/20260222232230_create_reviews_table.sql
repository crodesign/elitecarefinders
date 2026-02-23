drop table if exists public.reviews cascade;

-- Create reviews table
create table public.reviews (
    id uuid default gen_random_uuid() primary key,
    author_name text not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    content text not null,
    entity_id uuid not null, -- references home or facility
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Admin policies
-- See common auth checks in this project (auth.uid() typically used, we'll allow anon read based on status, but admins full manage)
-- Wait, the prompt said "Reviews are visible by only admins".

create policy "Reviews are viewable by admins only"
    on public.reviews for select
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Reviews are insertable by admins only"
    on public.reviews for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Reviews are updatable by admins only"
    on public.reviews for update
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

create policy "Reviews are deletable by admins only"
    on public.reviews for delete
    to authenticated
    using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'system_admin')
        )
    );

-- Add updated_at trigger functionality if desired, but Review type only has createdAt. Let's stick to createdAt.
