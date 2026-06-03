import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "I'm IN",
  description:
    "Plataforma de inscripcion, acreditacion y networking para eventos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
