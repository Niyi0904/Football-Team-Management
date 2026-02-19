import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/Toaster";
import { AppDataProvider } from "./context/AppDataContext";
import Sidebar from "@/components/Sidebar";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { StoreProvider } from "@/components/providers/reduxStoreProvider";
import AuthStateListener from "@/components/providers/authStateListener";


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
        <StoreProvider>
          <AuthStateListener/>
            <TooltipProvider>
              <Toaster />
              {children}
              <SpeedInsights/>
            </TooltipProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

// Sidebar is a client component; imported directly above and rendered inside AppDataProvider
