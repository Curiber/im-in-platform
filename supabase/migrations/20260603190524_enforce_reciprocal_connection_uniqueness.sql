create unique index connection_requests_unique_active_pair_idx
on public.connection_requests (
  event_id,
  least(requester_registration_id, receiver_registration_id),
  greatest(requester_registration_id, receiver_registration_id)
)
where status in ('pending', 'accepted');
