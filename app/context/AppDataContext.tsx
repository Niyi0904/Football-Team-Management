'use client';

import { createContext, useContext, ReactNode } from "react";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

type AppDataContextType = ReturnType<typeof useAppData> & {
  isAdmin: boolean;
  user: ReturnType<typeof useAuth>["user"];
  signOut: ReturnType<typeof useAuth>["signOut"];
};

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const data = useAppData();
  const { user, isAdmin, signOut } = useAuth();
  return (
    <AppDataContext.Provider value={{ ...data, isAdmin, user, signOut }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppContext must be used within AppDataProvider");
  return ctx;
}
