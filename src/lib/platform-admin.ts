type UserLike = {
  app_metadata?: Record<string, unknown>;
} | null;

export function isPlatformAdmin(user: UserLike) {
  return user?.app_metadata?.platform_role === "platform_admin";
}
