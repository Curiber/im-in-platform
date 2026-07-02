import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getAppUrl } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// theme-color de la PWA (spec 28): navy de marca en la barra del sistema.
export const viewport: Viewport = {
  themeColor: "#071b33",
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "I'M IN",
    template: "%s | I'M IN",
  },
  description:
    "Plataforma de inscripcion, acreditacion y networking para eventos.",
  icons: {
    icon: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        url: "/brand/im-in-mark.png",
      },
    ],
    apple: [
      {
        type: "image/png",
        sizes: "512x512",
        url: "/brand/im-in-mark.png",
      },
    ],
  },
  openGraph: {
    description:
      "Plataforma de inscripcion, acreditacion y networking para eventos.",
    images: [
      {
        alt: "I'M IN",
        height: 300,
        url: "/brand/im-in-logo.png",
        width: 1200,
      },
    ],
    siteName: "I'M IN",
    title: "I'M IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
