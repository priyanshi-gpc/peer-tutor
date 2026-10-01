-- PeerX: private contact information
-- Run this once in Supabase SQL Editor.

create table if not exists profile_contacts (
    profile_id uuid primary key references profiles(id) on delete cascade,
    phone text,
    created_at timestamptz default now()
);

alter table profile_contacts enable row level security;

-- Remove old versions if you rerun this script.
drop policy if exists "Owners can manage contact" on profile_contacts;
drop policy if exists "Accepted request participants can view contact" on profile_contacts;

create policy "Owners can manage contact"
on profile_contacts
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "Accepted request participants can view contact"
on profile_contacts
for select
using (
    auth.uid() = profile_id
    or exists (
        select 1
        from tutor_requests tr
        where tr.status = 'accepted'
          and (
              (tr.student_id = auth.uid() and tr.tutor_id = profile_contacts.profile_id)
              or
              (tr.tutor_id = auth.uid() and tr.student_id = profile_contacts.profile_id)
          )
    )
);
