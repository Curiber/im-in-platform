"use server";

import { redirect } from "next/navigation";

import { sendConnectionAcceptedEmail } from "@/lib/email";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RegistrationContact = {
  id: string;
  email: string;
  full_name_snapshot: string;
};

export async function createConnectionRequest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const token = String(formData.get("token") ?? "");
  const receiverRegistrationId = String(
    formData.get("receiverRegistrationId") ?? "",
  );

  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (
    !viewer ||
    !receiverRegistrationId ||
    viewer.id === receiverRegistrationId
  ) {
    redirect(
      `/e/${slug}/directory?registrationId=${registrationId}&token=${token}`,
    );
  }

  const adminClient = createSupabaseAdminClient();
  const { data: receiver } = await adminClient
    .from("event_registrations")
    .select("id")
    .eq("id", receiverRegistrationId)
    .eq("event_id", viewer.event_id)
    .eq("public_profile_enabled", true)
    .single<{ id: string }>();

  if (!receiver) {
    redirect(`/e/${slug}/directory?registrationId=${viewer.id}&token=${token}`);
  }

  const { data: existingRequest } = await adminClient
    .from("connection_requests")
    .select("id")
    .eq("event_id", viewer.event_id)
    .in("status", ["pending", "accepted"])
    .or(
      [
        `and(requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${receiver.id})`,
        `and(requester_registration_id.eq.${receiver.id},receiver_registration_id.eq.${viewer.id})`,
      ].join(","),
    )
    .maybeSingle<{ id: string }>();

  if (!existingRequest) {
    await adminClient.from("connection_requests").insert({
      event_id: viewer.event_id,
      requester_registration_id: viewer.id,
      receiver_registration_id: receiver.id,
    });
  }

  redirect(`/e/${slug}/connections?registrationId=${viewer.id}&token=${token}`);
}

export async function acceptConnectionRequest(formData: FormData) {
  await respondToConnectionRequest(formData, "accepted");
}

export async function rejectConnectionRequest(formData: FormData) {
  await respondToConnectionRequest(formData, "rejected");
}

async function respondToConnectionRequest(
  formData: FormData,
  status: "accepted" | "rejected",
) {
  const slug = String(formData.get("slug") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const token = String(formData.get("token") ?? "");
  const requestId = String(formData.get("requestId") ?? "");

  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer || !requestId) {
    redirect(`/e/${slug}/connections?registrationId=${registrationId}&token=${token}`);
  }

  const adminClient = createSupabaseAdminClient();
  const { data: request } = await adminClient
    .from("connection_requests")
    .select("id, event_id, requester_registration_id, receiver_registration_id, status")
    .eq("id", requestId)
    .eq("receiver_registration_id", viewer.id)
    .single<{
      id: string;
      event_id: string;
      requester_registration_id: string;
      receiver_registration_id: string;
      status: "pending" | "accepted" | "rejected" | "cancelled";
    }>();

  if (!request || request.status !== "pending") {
    redirect(`/e/${slug}/connections?registrationId=${viewer.id}&token=${token}`);
  }

  await adminClient
    .from("connection_requests")
    .update({
      responded_at: new Date().toISOString(),
      status,
    })
    .eq("id", request.id);

  if (status === "accepted") {
    await notifyAcceptedConnection({
      eventName: viewer.events?.name ?? "evento",
      receiverId: request.receiver_registration_id,
      requesterId: request.requester_registration_id,
    });
  }

  redirect(`/e/${slug}/connections?registrationId=${viewer.id}&token=${token}`);
}

async function notifyAcceptedConnection({
  eventName,
  receiverId,
  requesterId,
}: {
  eventName: string;
  receiverId: string;
  requesterId: string;
}) {
  const adminClient = createSupabaseAdminClient();
  const { data: contacts } = await adminClient
    .from("event_registrations")
    .select("id, email, full_name_snapshot")
    .in("id", [requesterId, receiverId])
    .returns<RegistrationContact[]>();

  const requester = contacts?.find((contact) => contact.id === requesterId);
  const receiver = contacts?.find((contact) => contact.id === receiverId);

  if (!requester || !receiver) {
    return;
  }

  try {
    await sendConnectionAcceptedEmail({
      eventName,
      receiverEmail: receiver.email,
      receiverName: receiver.full_name_snapshot,
      requesterEmail: requester.email,
      requesterName: requester.full_name_snapshot,
    });
  } catch {
    // Email delivery should not block the accepted connection.
  }
}
