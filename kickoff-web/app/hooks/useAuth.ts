'use client';

import { useState, useEffect, useRef } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  getIdTokenResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDocument } from "@/lib/firestore";
import { uploadProfileImage } from "@/lib/uploadImage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────
// Secure role check
//
// We do NOT use the roles boolean from client
// state as the source of truth for writes —
// Firestore Security Rules handle that server-side.
//
// This function's job is purely to control UI
// visibility (show/hide buttons). It reads
// user_roles/{uid} directly, same collection the
// Security Rules check, so it stays in sync.
//
// Failures default to 'player' — a Firestore error
// never accidentally grants access.
// ─────────────────────────────────────────────
interface UserRoleInfo {
  role: 'league_manager' | 'team_manager' | 'player' | 'admin' | 'user' | null;
  teamId?: string | null;
  playerId?: string | null;
  leagueId?: string | null;
}

async function getUserRoleInfo(uid: string): Promise<UserRoleInfo> {
  try {
    // Force a fresh token to ensure the auth session is valid
    // before making the role check. This prevents stale sessions
    // from retaining state after a password change or revocation.
    await auth.currentUser?.getIdToken(/* forceRefresh */ true);

    const roleSnap = await getDoc(doc(db, "user_roles", uid));
    if (!roleSnap.exists()) return { role: 'player' };
    const data = roleSnap.data();
    return {
      role: data?.role ?? 'player',
      teamId: data?.teamId ?? null,
      playerId: data?.playerId ?? null,
      leagueId: data?.leagueId ?? null,
    };
  } catch (error) {
    // Deliberately fail closed — never grant admin/manager on error
    console.error("Fetch user role info failed:", error);
    return { role: 'player' };
  }
}

export function useAuth() {
  const [user,      setUser]      = useState<User | null>(null);
  const [role,      setRole]      = useState<'league_manager' | 'team_manager' | 'player' | 'admin' | 'user' | null>(null);
  const [teamId,    setTeamId]    = useState<string | null>(null);
  const [playerId,  setPlayerId]  = useState<string | null>(null);
  const [leagueId,  setLeagueId]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  const isLeagueManager = role === 'league_manager' || role === 'admin';
  const isTeamManager = role === 'team_manager';
  const isPlayer = role === 'player' || role === 'user';
  const isAdmin = isLeagueManager; // Backward compatibility

  // Track the current user's uid in a ref so the async role
  // check can bail out if the user logs out while it's in flight.
  const currentUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      currentUidRef.current = currentUser?.uid ?? null;

      if (currentUser) {
        // Defaults while async check runs
        setRole(null);
        setTeamId(null);
        setPlayerId(null);
        setLeagueId(null);

        const info = await getUserRoleInfo(currentUser.uid);

        // Only apply the result if this user is still the active session.
        if (currentUidRef.current === currentUser.uid) {
          setRole(info.role);
          setTeamId(info.teamId ?? null);
          setPlayerId(info.playerId ?? null);
          setLeagueId(info.leagueId ?? null);
        }
      } else {
        // Signed out — always clear state immediately
        setRole(null);
        setTeamId(null);
        setPlayerId(null);
        setLeagueId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Sign in ────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // ── Sign up ────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    file?: File | null
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      let photoUrl: string | null = null;
      if (file) {
        try {
          const uploadRes = await uploadProfileImage(file);
          photoUrl = uploadRes?.data?.url ?? null;
        } catch (uploadError) {
          console.error("Profile image upload failed", uploadError);
        }
      }

      try {
        await updateProfile(result.user, {
          displayName,
          photoURL: photoUrl ?? undefined,
        });
      } catch (profileErr) {
        console.error("updateProfile error", profileErr);
      }

      await createUserDocument(
        result.user.uid,
        email,
        displayName,
        photoUrl ?? undefined
      );

      return { error: null, userId: result.user.uid };
    } catch (error: any) {
      return { error, userId: null };
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      // Clear role state immediately on sign out
      setRole(null);
      setTeamId(null);
      setPlayerId(null);
      setLeagueId(null);
      currentUidRef.current = null;
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Sign out error:", error);
    }
  };

  // ── Password Reset ─────────────────────────────────────────────────────
  const sendPasswordReset = async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    user,
    role,
    isLeagueManager,
    isTeamManager,
    isPlayer,
    teamId,
    playerId,
    leagueId,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordReset
  };
}
