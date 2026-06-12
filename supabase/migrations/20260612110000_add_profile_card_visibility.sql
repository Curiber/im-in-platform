create type public.profile_card_visibility as enum (
  'private',
  'public_limited',
  'public_full'
);

alter table public.attendee_profiles
  add column card_visibility public.profile_card_visibility not null default 'private',
  add column public_email_enabled boolean not null default false,
  add column public_phone_enabled boolean not null default false;

alter type public.consent_type add value if not exists 'public_card';

create index attendee_profiles_profile_slug_visibility_idx
  on public.attendee_profiles (profile_slug, card_visibility);
