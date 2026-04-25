import type { Metadata, Viewport } from "next";
import { Albert_Sans, Abhaya_Libre, Anonymous_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CustomThemeProvider } from "@/components/providers/custom-theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-sans'
});

const abhayaLibre = Abhaya_Libre({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif'
});

const anonymousPro = Anonymous_Pro({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: "Admin Portal | Shweloader",
  description: "Admin portal for managing Shweloader resources",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${albertSans.variable} ${abhayaLibre.variable} ${anonymousPro.variable} h-screen`}>
      <body className="antialiased h-full flex flex-col">
        <ThemeProvider>
          <CustomThemeProvider>
            {children}
            <Toaster position="top-center" />
          </CustomThemeProvider>
        </ThemeProvider>
        {process.env.VERCEL && <Analytics />}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
