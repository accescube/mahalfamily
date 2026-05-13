import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MahalFamily | Kerala Muslim Community Family Trees",
  description: "A community-driven Family Tree web application for the Kerala Muslim community's Mahal structure.",
};

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-brand-sand text-gray-900 font-sans flex flex-col`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-20">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

