import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const nunito = localFont({
  src: [
    {
      path: "../fonts/nunito/nunito-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/nunito/nunito-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/nunito/nunito-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Madhouse Lab",
  description: "A multi-page Next.js experience focused on craft and clarity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${nunito.variable} ${plexMono.variable} min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="madhouse-theme"
        >
          <div className="root">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
