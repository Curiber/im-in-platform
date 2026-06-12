import { ImageResponse } from "next/og";
import QRCode from "qrcode";

import {
  canShowPublicEmail,
  canShowPublicPhone,
  isProfileCardPublic,
  type ProfileCardVisibility,
} from "@/lib/profile-card-visibility";
import { getAppUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CardProfile = {
  avatar_url: string | null;
  card_visibility: ProfileCardVisibility;
  company: string | null;
  email: string;
  full_name: string;
  headline: string | null;
  linkedin_url: string | null;
  phone: string | null;
  profile_slug: string;
  public_email_enabled: boolean;
  public_phone_enabled: boolean;
  role: string | null;
};

const WIDTH = 640;
const HEIGHT = 1120;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileSlug: string }> },
) {
  const { profileSlug } = await params;
  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("attendee_profiles")
    .select(
      "avatar_url, card_visibility, company, email, full_name, headline, linkedin_url, phone, profile_slug, public_email_enabled, public_phone_enabled, role",
    )
    .eq("profile_slug", profileSlug)
    .single<CardProfile>();

  if (!profile || !isProfileCardPublic(profile)) {
    return new Response("Perfil no encontrado", { status: 404 });
  }

  const profileUrl = `${getAppUrl()}/p/${profile.profile_slug}`;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
  });

  const roleLine = [profile.role, profile.company]
    .filter(Boolean)
    .join(" · ");

  const showEmail = canShowPublicEmail(profile);
  const showPhone = canShowPublicPhone(profile) && Boolean(profile.phone);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "48px 48px 40px",
            backgroundImage:
              "linear-gradient(135deg, #071B33 0%, #1267B3 60%, #19A7CE 100%)",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 6,
              }}
            >
              I&apos;M IN
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 3,
                color: "#8BE6D1",
                textTransform: "uppercase",
              }}
            >
              Tarjeta profesional
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 48,
              gap: 24,
            }}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                src={profile.avatar_url}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: "4px solid rgba(255,255,255,0.35)",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 120,
                  height: 120,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  border: "4px solid rgba(255,255,255,0.35)",
                  fontSize: 44,
                  fontWeight: 700,
                }}
              >
                {initials(profile.full_name)}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 44,
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                {profile.full_name}
              </div>
              {roleLine ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: 10,
                    fontSize: 24,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {roleLine}
                </div>
              ) : null}
            </div>
          </div>

          {profile.headline ? (
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 24,
                lineHeight: 1.4,
                color: "#8BE6D1",
              }}
            >
              {profile.headline}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "40px 48px",
            gap: 18,
          }}
        >
          {showEmail ? <ContactRow label="Email" value={profile.email} /> : null}
          {showPhone ? (
            <ContactRow label="Telefono" value={profile.phone as string} />
          ) : null}
          {profile.linkedin_url ? (
            <ContactRow
              label="LinkedIn"
              value={profile.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 18,
              padding: 28,
              borderRadius: 16,
              border: "1px solid #B9DDD8",
              backgroundColor: "#F7FAFC",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              src={qrDataUrl}
              style={{ width: 280, height: 280, borderRadius: 8 }}
            />
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 20,
                fontWeight: 600,
                color: "#0B2A4A",
              }}
            >
              Escanea para conectar en I&apos;M IN
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "26px 48px",
            backgroundColor: "#071B33",
            color: "rgba(255,255,255,0.85)",
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          Conectar · Compartir · Crear impacto
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="im-in-${profile.profile_slug}.png"`,
      },
    },
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#19A7CE",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 4,
          fontSize: 23,
          fontWeight: 600,
          color: "#101828",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
