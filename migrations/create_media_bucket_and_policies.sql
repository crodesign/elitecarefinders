
-- 1. Ensure the 'media' bucket exists (Commented out as script handles this)
-- insert into storage.buckets (id, name, public)
-- values ('media', 'media', true)
-- on conflict (id) do nothing;

-- 2. Enable RLS (Already enabled by default in Supabase, removing to avoid permission error)
-- alter table storage.objects enable row level security;

-- 3. Policies for 'media' bucket

-- Public Read Access
drop policy if exists "Media Bucket Public Read" on storage.objects;
create policy "Media Bucket Public Read"
  on storage.objects for select
  using ( bucket_id = 'media' );

-- Authenticated User Upload (Insert)
-- Allow users to upload files to 'profile-photos/' folder with their own ID
drop policy if exists "User Upload Profile Photo" on storage.objects;
create policy "User Upload Profile Photo"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'profile-photos'
  );

-- Authenticated User Update
-- Allow users to overwrite their own files
drop policy if exists "User Update Profile Photo" on storage.objects;
create policy "User Update Profile Photo"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'profile-photos'
  );

-- Authenticated User Delete
drop policy if exists "User Delete Profile Photo" on storage.objects;
create policy "User Delete Profile Photo"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'profile-photos'
  );

-- Admin Full Access
drop policy if exists "Admin Full Access Media" on storage.objects;
create policy "Admin Full Access Media"
  on storage.objects for all
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('super_admin', 'system_admin')
    )
  );
