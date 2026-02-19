import Sidebar from "@/components/Sidebar";
import { AppDataProvider } from "../context/AppDataContext";
import { LeagueHydrator } from "@/components/LeagueHydrator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppDataProvider>
      <LeagueHydrator/>
      <Sidebar>
        {children}
      </Sidebar>
    </AppDataProvider>
  );
}

// Sidebar is a client component; imported directly above and rendered inside AppDataProvider
