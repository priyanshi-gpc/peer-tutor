-- PeerX: allow tutors to accept/reject requests assigned to them.
alter table tutor_requests enable row level security;

create policy "Tutors can update their incoming requests"
on tutor_requests
for update
using (auth.uid() = tutor_id)
with check (auth.uid() = tutor_id);
