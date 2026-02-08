import type { Metadata } from "next";
import { Albert_Sans, Abhaya_Libre, Anonymous_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ['latin'],
  variable: '--font-sans'
});

const abhayaLibre = Abhaya_Libre({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${albertSans.variable} ${abhayaLibre.variable} ${anonymousPro.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
