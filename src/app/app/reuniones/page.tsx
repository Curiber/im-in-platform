import { CalendarClock, Check, Clock, MapPin, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  acceptMeeting,
  declineMeeting,
} from "@/app/app/reuniones/actions";
import { getAttendeeUser } from "@/lib/attendee-account";
import {
  getMyMeetings,
  type MyMeeting,
  splitMeetingsByDate,
} from "@/lib/attendee-meetings";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<MyMeeting["status"], string> = {
  pending: "Solicitada",
  accepted: "Confirmada",
  completed: "Realizada",
};

export default async function MyMeetingsPage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/reuniones");
  }

  const meetings = await getMyMeetings();
  const { upcoming, past } = splitMeetingsByDate(meetings);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <CalendarClock className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Mis reuniones
      </h1>
      <p className="mt-2 text-brand-slate-600">
        Tus reuniones 1:1 solicitadas, confirmadas y realizadas, de todos tus
        eventos.
      </p>

      {meetings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-10 text-center shadow-sm">
          <CalendarClock
            className="mx-auto size-10 text-brand-cyan-500"
            aria-hidden="true"
          />
          <p className="mt-3 font-semibold text-brand-navy-950">
            Aun no tienes reuniones
          </p>
          <p className="mt-1 text-sm text-brand-slate-600">
            Agenda reuniones con otros asistentes desde el networking de cada
            evento.
          </p>
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            href="/app/eventos"
          >
            Ir a mis eventos
          </Link>
        </div>
      ) : null}

      {upcoming.length ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Proximas</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </section>
      ) : null}

      {past.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Pasadas</h2>
          <div className="mt-4 space-y-3">
            {past.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function MeetingCard({ meeting }: { meeting: MyMeeting }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar
            avatarUrl={meeting.other.avatarUrl}
            name={meeting.other.fullName}
          />
          <div className="min-w-0">
            <p className="font-semibold text-brand-navy-950">
              {meeting.other.fullName}
            </p>
            <p className="text-sm text-brand-slate-600">
              {meeting.other.role ?? "Rol por confirmar"}
              {meeting.other.company ? ` · ${meeting.other.company}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-slate-600">
        <span className="flex items-center gap-1.5">
          <Clock className="size-4 text-brand-cyan-500" aria-hidden="true" />
          {formatDateTime(meeting.startsAt)}
        </span>
        {meeting.locationName ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-brand-cyan-500" aria-hidden="true" />
            {meeting.locationName}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-brand-slate-600">
        En{" "}
        <Link
          className="font-semibold text-brand-navy-950 hover:underline"
          href={`/e/${meeting.eventSlug}`}
        >
          {meeting.eventName}
        </Link>
      </p>

      {meeting.status === "pending" && meeting.isIncoming ? (
        <div className="mt-4 flex gap-2">
          <form action={acceptMeeting}>
            <input name="meetingId" type="hidden" value={meeting.id} />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-navy-950 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
              type="submit"
            >
              <Check className="size-4" aria-hidden="true" />
              Aceptar
            </button>
          </form>
          <form action={declineMeeting}>
            <input name="meetingId" type="hidden" value={meeting.id} />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              type="submit"
            >
              <X className="size-4" aria-hidden="true" />
              Rechazar
            </button>
          </form>
        </div>
      ) : meeting.status === "pending" ? (
        <p className="mt-3 text-xs italic text-brand-slate-600">
          Esperando respuesta.
        </p>
      ) : null}
    </article>
  );
}

function StatusBadge({ status }: { status: MyMeeting["status"] }) {
  const styles: Record<MyMeeting["status"], string> = {
    accepted: "bg-brand-navy-950 text-brand-mint-300",
    pending: "bg-white text-brand-blue-700 shadow-sm",
    completed: "bg-brand-slate-100 text-brand-slate-600",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white"
        src={avatarUrl}
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-sm font-semibold text-white ring-2 ring-white">
      {initials}
    </span>
  );
}
