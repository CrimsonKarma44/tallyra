import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ledger — POS transactions",
  description: "Record point-of-sale transactions in place of a paper sales book.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let user: { username: string; displayName: string | null; avatarUpdatedAt: Date | null } | null = null;
  if (session.userId) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, displayName: true, avatarUpdatedAt: true },
    });
  }
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <div className="app-shell">
          <Header user={user} />
          {children}
        </div>
      </body>
    </html>
  );
}
