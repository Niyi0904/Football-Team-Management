'use client';

/**
 * AppDataContext.tsx
 *
 * Backward-compatible composition layer.
 * Internally uses AuthContext + DataContext as two separate providers
 * so their lifecycles are fully decoupled:
 *   - Auth token refreshes (every ~1hr) don't re-render data subscribers
 *   - Firestore data updates don't re-render auth-only components
 *
 * All existing pages continue using useAppContext() with zero changes
 * to their destructuring calls — the returned shape is identical to before.
 *
 * As you refactor individual pages over time, you can switch them to use
 * useAuthContext() or useDataContext() directly for even more precision:
 *
 *   // Before (works fine, slightly over-subscribes):
 *   const { isAdmin, signOut } = useAppContext();
 *
 *   // After (only re-renders on auth changes, never on data changes):
 *   const { isAdmin, signOut } = useAuthContext();
 */

import { ReactNode } from "react";
import { AuthProvider, useAuthContext } from "./AuthContext";
import { DataProvider, useDataContext } from "./DataContext";

// Re-export for direct use in new components
export { useAuthContext } from "./AuthContext";
export { useDataContext } from "./DataContext";

// ─────────────────────────────────────────────
// Composed provider
// AuthProvider is outer — auth state is available
// everywhere including inside DataProvider if needed.
// ─────────────────────────────────────────────
export function AppDataProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────
// useAppContext — backward-compatible merged hook.
// Returns the same shape as the old single context
// so all existing consumers work without any changes.
// ─────────────────────────────────────────────
export function useAppContext() {
  const auth = useAuthContext();
  const data = useDataContext();

  return {
    // ── From AuthContext ──────────────────────
    user: auth.user,
    role: auth.role,
    isLeagueManager: auth.isLeagueManager,
    isTeamManager: auth.isTeamManager,
    isPlayer: auth.isPlayer,
    teamId: auth.teamId,
    playerId: auth.playerId,
    leagueId: auth.leagueId,
    isAdmin: auth.isAdmin,
    authLoading: auth.loading, // renamed to avoid clash with data.loading
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    // ── From DataContext ──────────────────────
    // data.loading stays as `loading` — used by pages for
    // skeleton states while Firestore collections are fetching
    ...data,
  };
}
