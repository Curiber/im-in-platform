alter table public.events
  add column cover_image_url text,
  add constraint events_cover_image_url_format check (
    cover_image_url is null
    or cover_image_url ~* '^https?://'
  );
