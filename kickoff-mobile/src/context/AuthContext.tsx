import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState, getUserProfile, getUserRole, signOutUser } from '../firebase/auth';
import { User, UserRoleDoc, RoleType } from '../lib/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  userRole: UserRoleDoc | null;
  role: RoleType | null;
  teamId: string | null;
  playerId: string | null;
  leagueId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLeagueManager: boolean;
  isTeamManager: boolean;
  isPlayer: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      currentUidRef.current = firebaseUser?.uid ?? null;

      if (firebaseUser) {
        setUserRole(null);
        const [profile, role] = await Promise.all([
          getUserProfile(firebaseUser.uid),
          getUserRole(firebaseUser.uid),
        ]);
        if (currentUidRef.current === firebaseUser.uid) {
          setUserProfile(profile);
          setUserRole(role);
        }
      } else {
        setUserProfile(null);
        setUserRole(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = userRole?.role ?? null;
  const teamId = userRole?.teamId ?? null;
  const playerId = userRole?.playerId ?? null;
  const leagueId = userRole?.leagueId ?? null;
  const isLeagueManager = role === 'league_manager' || role === 'admin';
  const isTeamManager = role === 'team_manager';
  const isPlayer = role === 'player' || role === 'user';
  const isAdmin = isLeagueManager;

  const value: AuthContextType = {
    user,
    userProfile,
    userRole,
    role,
    teamId,
    playerId,
    leagueId,
    isLoading,
    isAuthenticated: !!user,
    isLeagueManager,
    isTeamManager,
    isPlayer,
    isAdmin,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
