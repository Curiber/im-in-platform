export const profileCardVisibilityValues = [
  "private",
  "public_limited",
  "public_full",
] as const;

export type ProfileCardVisibility = (typeof profileCardVisibilityValues)[number];

type ContactVisibilityProfile = {
  card_visibility: ProfileCardVisibility;
  public_email_enabled: boolean;
  public_phone_enabled: boolean;
};

export function isProfileCardPublic(profile: ContactVisibilityProfile) {
  return profile.card_visibility !== "private";
}

export function canShowPublicEmail(profile: ContactVisibilityProfile) {
  return profile.card_visibility === "public_full" && profile.public_email_enabled;
}

export function canShowPublicPhone(profile: ContactVisibilityProfile) {
  return profile.card_visibility === "public_full" && profile.public_phone_enabled;
}
