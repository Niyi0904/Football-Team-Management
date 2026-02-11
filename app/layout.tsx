import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/Toaster";
import { AppDataProvider } from "./context/AppDataContext";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KICKOFF - Team Management",
  description: "Manage your teams, players, and match records with KICKOFF",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75' role='img' aria-label='soccer ball'>⚽</text></svg>",
        type: "image/svg+xml",
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppDataProvider>
          <TooltipProvider>
            <Toaster />
            <Sidebar>{children}</Sidebar>
          </TooltipProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}

// Sidebar is a client component; imported directly above and rendered inside AppDataProvider
