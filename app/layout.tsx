import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  Inter,
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Montserrat,
  Noto_Sans_Tamil,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const studentDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const studentBody = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const brand = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-brand",
  display: "swap",
});

// Tamil script support — applied site-wide when locale is `ta`.
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DriveScore — mock tests that explain why",
  description:
    "Mock tests with a diagnosis engine that explains why marks were lost — not just the score. Student, teacher and parent views.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DriveScore",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#06140f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${studentDisplay.variable} ${studentBody.variable} ${brand.variable} ${tamil.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>{children}</SessionProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
