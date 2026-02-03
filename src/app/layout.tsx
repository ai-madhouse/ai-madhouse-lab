import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Madhouse Lab",
  description: "A multi-page Next.js experience focused on craft and clarity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = cookies().get("NEXT_LOCALE")?.value ?? "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="madhouse-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
