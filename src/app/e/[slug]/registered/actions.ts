"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifyRegistrationAccess } from "@/lib/registrations";
import { removeStaleFiles } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_BUCKET = "profile-photos";
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function uploadProfilePhoto(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const token = String(formData.get("token") ?? "");
  const file = formData.get("photo");
  const redirectPath = `/e/${slug}/registered?registrationId=${registrationId}&token=${token}`;

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${redirectPath}&photoStatus=missing`);
  }

  const extension = allowedImageTypes.get(file.type);

  if (!extension || file.size > MAX_PROFILE_PHOTO_BYTES) {
    redirect(`${redirectPath}&photoStatus=invalid`);
  }

  const registration = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!registration?.profile_id) {
    redirect(`${redirectPath}&photoStatus=error`);
  }

  const adminClient = createSupabaseAdminClient();
  const folder = `profiles/${registration.profile_id}`;
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storagePath = `${folder}/${fileName}`;

  const { error: uploadError } = await adminClient.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    redirect(`${redirectPath}&photoStatus=error`);
  }

  const { data } = adminClient.storage
    .from(PROFILE_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  const { error: updateError } = await adminClient
    .from("attendee_profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", registration.profile_id);

  if (updateError) {
    redirect(`${redirectPath}&photoStatus=error`);
  }

  // La foto nueva ya quedo persistida: borra las anteriores del bucket.
  await removeStaleFiles(adminClient, PROFILE_PHOTO_BUCKET, folder, fileName);

  revalidatePath(`/e/${slug}/registered`);
  revalidatePath(`/e/${slug}/directory`);
  redirect(`${redirectPath}&photoStatus=uploaded`);
}
