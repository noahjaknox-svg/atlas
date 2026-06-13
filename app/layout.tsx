import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthHashRedirect } from "@/components/auth-hash-redirect";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Atlas by PrismJet",
  description: "Personalized aircraft management proposals and pro formas",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full bg-atlas-bg font-sans text-atlas-text antialiased">
        <AuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
