'use client';

import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isUserAdmin, createUserDocument } from "@/lib/firestore";
import { uploadProfileImage } from "@/lib/uploadImage";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const adminStatus = await isUserAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error };
    }
  };

  const signUp = async (email: string, password: string, displayName: string, file?: File | null, leagueId?: string | null) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      let photoUrl: string | null = null;
      if (file) {
        try {
          const uploadRes = await uploadProfileImage(file);
          // imgBB returns { data: { url: string } } on success
          photoUrl = uploadRes?.data?.url ?? null;
        } catch (uploadError) {
          console.error('Profile image upload failed', uploadError);
        }
      }

      // Update Firebase user profile with displayName and optional photoURL
      try {
        await updateProfile(result.user, { displayName, photoURL: photoUrl ?? undefined });
      } catch (profileErr) {
        console.error('updateProfile error', profileErr);
      }

      // Create user document in Firestore (include photoUrl if available)
      await createUserDocument(result.user.uid, email, displayName, photoUrl ?? undefined, leagueId);

      return { error: null, userId: result.user.uid };
    } catch (error: any) {
      return { error, userId: null };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  return { user, isAdmin, loading, signIn, signUp, signOut };
}
