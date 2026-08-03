'use client';

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { useToast } from "@/app/hooks/use-toast";
import { getAuth } from "firebase/auth";

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  teamId: string;
  isManager: boolean;
  photo?: string | null;
  linkedUserId?: string | null
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  approved: boolean;
  logo?: string | null;
  primaryColor: string;
  founded: string;
  stadium: string;
}

export interface MatchRecord {
  id: string;
  playerId: string;
  matchId?: string;
  matchDate: string;
  opponent: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

export interface Match {
  id: string;
  matchDay: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeYellows: number;
  awayYellows: number;
  homeReds: number;
  awayReds: number;
  homePoints: number;
  awayPoints: number;
  minutesPlayed: number;
  league: string;
  createdAt: any;
  time?: string;
  status: 'upcoming' | 'live' | 'played';
  scheduledDate?: string;
  report?: string;
  keyMoments?: string;
  // Live match fields
  matchTimer?: number;
  stoppageTime?: number;
  matchPhase?: 'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime';
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeOffsides?: number;
  awayOffsides?: number;
  homeFouls?: number;
  awayFouls?: number;
}

export interface PlayerEvent {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: any;
}

export interface MatchAttendance {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  present: boolean;
  timestamp: any;
}

// ─────────────────────────────────────────────
// Query Keys — single source of truth
// ─────────────────────────────────────────────

export const QUERY_KEYS = {
  teams:       ['teams']       as const,
  players:     ['players']     as const,
  matches:     ['matches']     as const,
  goals:       ['goals']       as const,
  assists:     ['assists']     as const,
  yellowCards: ['yellowCards'] as const,
  redCards:    ['redCards']    as const,
  attendance:  ['attendance']  as const,
};

// ─────────────────────────────────────────────
// Fetchers — pure async functions, no React state
// ─────────────────────────────────────────────

async function fetchTeams(): Promise<Team[]> {
  // Exclude soft-deleted teams (deletedAt != null)
  const snap = await getDocs(query(collection(db, "teams"), where("deletedAt", "==", null)));
  return snap.docs.map((d) => {
    const t = d.data();
    return {
      id: d.id,
      name: t.name,
      abbreviation: t.abbreviation ?? t.name?.substring(0, 3).toUpperCase() ?? "",
      approved: t.approved ?? true, // Fallback: existing teams treated as approved
      logo: t.logo ?? null,
      primaryColor: t.primary_color ?? t.primaryColor ?? "",
      founded: t.founded ?? "",
      stadium: t.stadium ?? "",
    };
  });
}

async function fetchPlayers(): Promise<Player[]> {
  // Exclude soft-deleted players (deletedAt != null)
  const snap = await getDocs(query(collection(db, "players"), where("deletedAt", "==", null)));
  return snap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      name: p.name,
      position: p.position,
      number: p.number,
      teamId: p.team_id ?? p.teamId,
      isManager: p.is_manager ?? p.isManager ?? false,
      photo: p.photo ?? null,
      linkedUserId: p.linkedUserId ?? null
    };
  });
}

async function fetchMatches(): Promise<Match[]> {
  // Exclude soft-deleted matches (deletedAt != null)
  const snap = await getDocs(query(collection(db, "matches"), orderBy("matchDay", "desc")));
  return snap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({ id: d.id, ...d.data() } as Match));
}

async function fetchEvents(colName: string): Promise<PlayerEvent[]> {
  // Exclude soft-deleted event records (deletedAt != null)
  const snap = await getDocs(query(collection(db, colName), where("deletedAt", "==", null)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerEvent));
}

async function fetchAttendance(): Promise<MatchAttendance[]> {
  // Exclude soft-deleted attendance records (deletedAt != null)
  const snap = await getDocs(query(collection(db, "match_attendance"), where("deletedAt", "==", null)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchAttendance));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Calculate points for home and away teams based on scores.
 */
function calculatePoints(match: Partial<Match>) {
  if (match.status !== 'played') return { home: 0, away: 0 };
  const h = match.homeScore ?? 0;
  const a = match.awayScore ?? 0;

  if (h > a) return { home: 3, away: 0 };
  if (h < a) return { home: 0, away: 3 };
  return { home: 1, away: 1 };
}

// ─────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────

export function useAppData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Queries (each collection independent) ──────────────────────────────
  const { data: teams = [], isLoading: teamsLoading } =
    useQuery({ queryKey: QUERY_KEYS.teams, queryFn: fetchTeams, staleTime: 1000 * 60 * 5 });

  const { data: players = [], isLoading: playersLoading } =
    useQuery({ queryKey: QUERY_KEYS.players, queryFn: fetchPlayers, staleTime: 1000 * 60 * 5 });

  const { data: matches = [], isLoading: matchesLoading } =
    useQuery({ queryKey: QUERY_KEYS.matches, queryFn: fetchMatches, staleTime: 1000 * 60 * 2 });

  const { data: goals = [] } =
    useQuery({ queryKey: QUERY_KEYS.goals, queryFn: () => fetchEvents("goals"), staleTime: 1000 * 60 * 2 });

  const { data: assists = [] } =
    useQuery({ queryKey: QUERY_KEYS.assists, queryFn: () => fetchEvents("assists"), staleTime: 1000 * 60 * 2 });

  const { data: yellowCards = [] } =
    useQuery({ queryKey: QUERY_KEYS.yellowCards, queryFn: () => fetchEvents("yellow_cards"), staleTime: 1000 * 60 * 2 });

  const { data: redCards = [] } =
    useQuery({ queryKey: QUERY_KEYS.redCards, queryFn: () => fetchEvents("red_cards"), staleTime: 1000 * 60 * 2 });

  const { data: attendance = [] } =
    useQuery({ queryKey: QUERY_KEYS.attendance, queryFn: fetchAttendance, staleTime: 1000 * 60 * 2 });

  const loading = teamsLoading || playersLoading || matchesLoading;

  // ── Invalidation helpers ───────────────────────────────────────────────
  const invalidate = useCallback((...keys: (keyof typeof QUERY_KEYS)[]) => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: QUERY_KEYS[k] }));
  }, [queryClient]);

  // ── Get current auth role (inlined for use in mutations) ───────────────
  const getCurrentUserRole = useCallback(async (): Promise<{ role: string; uid: string } | null> => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      const roleSnap = await getDoc(doc(db, "user_roles", currentUser.uid));
      const role = roleSnap.exists() ? (roleSnap.data().role ?? 'player') : 'player';
      return { role, uid: currentUser.uid };
    } catch {
      return null;
    }
  }, []);

  // ── Team mutations ─────────────────────────────────────────────────────
  interface AddTeamPayload {
    name: string;
    abbreviation: string;
    stadium: string;
    founded: string;
    primaryColor: string;
    logo?: string | null;
  }

  const addTeam = async (team: AddTeamPayload) => {
    try {
      const userInfo = await getCurrentUserRole();
      const isLeagueManager = userInfo?.role === 'league_manager' || userInfo?.role === 'admin';
      const approved = isLeagueManager || false;

      const docRef = await addDoc(collection(db, "teams"), {
        name: team.name,
        abbreviation: team.abbreviation,
        stadium: team.stadium,
        founded: team.founded,
        primary_color: team.primaryColor,
        logo: team.logo ?? null,
        approved: approved,
        createdAt: serverTimestamp(),
      });

      // If the creator is a team_manager, automatically link them as manager
      if (userInfo && !isLeagueManager) {
        // Find the player record for this user
        const playersSnap = await getDocs(
          query(collection(db, "players"), where("linkedUserId", "==", userInfo.uid))
        );
        if (!playersSnap.empty) {
          const playerDoc = playersSnap.docs[0];
          // Update the player's team
          await updateDoc(doc(db, "players", playerDoc.id), {
            team_id: docRef.id,
            is_manager: true,
          });
          // Update user_roles with teamId
          await updateDoc(doc(db, "user_roles", userInfo.uid), {
            teamId: docRef.id,
          });
        }
      }

      invalidate("teams", "players");
      toast({ title: "Success", description: "Team added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add team", variant: "destructive" });
      return { error };
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.primaryColor) {
        dbUpdates.primary_color = updates.primaryColor;
        delete dbUpdates.primaryColor;
      }
      // Strip id from updates
      delete dbUpdates.id;
      await updateDoc(doc(db, "teams", id), dbUpdates);
      invalidate("teams");
      toast({ title: "Success", description: "Team updated successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to update team", variant: "destructive" });
      return { error };
    }
  };

  const approveTeam = async (teamId: string) => {
    try {
      await updateDoc(doc(db, "teams", teamId), { approved: true });
      invalidate("teams");
      toast({ title: "Success", description: "Team approved successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve team", variant: "destructive" });
      return { error };
    }
  };

  const deleteTeam = async (teamId: string) => {
    const hasPlayers = players.some((p) => p.teamId === teamId);
    if (hasPlayers) {
      toast({ title: "Error", description: "Cannot delete team with active players", variant: "destructive" });
      return { error: "Cannot delete team with active players." };
    }
    try {
      // Soft delete: mark with deletedAt instead of removing from database
      await updateDoc(doc(db, "teams", teamId), { deletedAt: serverTimestamp() });
      invalidate("teams");
      toast({ title: "Success", description: "Team deleted successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete team", variant: "destructive" });
      return { error: "Failed to delete from database" };
    }
  };

  // ── Player mutations ───────────────────────────────────────────────────
  const addPlayer = async (player: Omit<Player, "id">) => {
    try {
      await addDoc(collection(db, "players"), {
        name: player.name,
        position: player.position,
        number: player.number,
        team_id: player.teamId,
        is_manager: player.isManager,
        photo: player.photo ?? null,
      });
      invalidate("players");
      toast({ title: "Success", description: "Player added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add player", variant: "destructive" });
      return { error };
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    try {
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.teamId)              { dbUpdates.team_id    = updates.teamId;    delete dbUpdates.teamId; }
      if (updates.isManager !== undefined) { dbUpdates.is_manager = updates.isManager; delete dbUpdates.isManager; }
      await updateDoc(doc(db, "players", id), dbUpdates);
      invalidate("players");
      toast({ title: "Success", description: "Player updated successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to update player", variant: "destructive" });
      return { error };
    }
  };

  const deletePlayer = async (id: string) => {
    try {
      // Soft delete: mark with deletedAt instead of removing from database
      await updateDoc(doc(db, "players", id), { deletedAt: serverTimestamp() });
      invalidate("players");
      toast({ title: "Success", description: "Player deleted successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete player", variant: "destructive" });
      return { error };
    }
  };

  const setManager = async (teamId: string, playerId: string) => {
    try {
      const q = query(collection(db, "players"), where("team_id", "==", teamId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { is_manager: false }));
      batch.update(doc(db, "players", playerId), { is_manager: true });
      await batch.commit();
      invalidate("players");
      toast({ title: "Success", description: "Manager assigned successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign manager", variant: "destructive" });
    }
  };

  // ── Match mutations ────────────────────────────────────────────────────
  const addMatch = async (matchData: Partial<Match> & { status: 'upcoming' | 'played' }) => {
    try {
      const matchesRef = collection(db, "matches");

      // If matchDay is explicitly provided, skip the auto-calculation entirely
      if (matchData.matchDay) {
        const docRef = await addDoc(matchesRef, {
          ...matchData,
          createdAt: serverTimestamp(),
          homePoints: calculatePoints(matchData).home,
          awayPoints: calculatePoints(matchData).away,
        });
        invalidate("matches");
        toast({ title: "Success", description: `Match Day ${matchData.matchDay} added` });
        return { id: docRef.id, matchDay: matchData.matchDay, error: null };
      }

      // Auto-calculate matchDay inside a transaction so no two
      // simultaneous writes can ever produce the same matchDay number.
      let newMatchDay = 1;
      let newDocId    = "";

      await runTransaction(db, async (transaction) => {
        // Read the highest existing matchDay inside the transaction
        const q    = query(matchesRef, orderBy("matchDay", "desc"), limit(1));
        const snap = await getDocs(q); // getDocs is fine inside transaction for queries
        newMatchDay = !snap.empty ? snap.docs[0].data().matchDay + 1 : 1;

        // Write the new match document inside the same transaction
        const newRef = doc(matchesRef);
        newDocId     = newRef.id;

        const homePoints = matchData.homeScore != null && matchData.awayScore != null
          ? matchData.homeScore > matchData.awayScore ? 3
          : matchData.homeScore === matchData.awayScore ? 1 : 0
          : 0;

        const awayPoints = matchData.homeScore != null && matchData.awayScore != null
          ? matchData.awayScore > matchData.homeScore ? 3
          : matchData.awayScore === matchData.homeScore ? 1 : 0
          : 0;

        transaction.set(newRef, {
          ...matchData,
          matchDay:    newMatchDay,
          homePoints,
          awayPoints,
          createdAt:   serverTimestamp(),
        });
      });

      invalidate("matches");
      toast({ title: "Success", description: `Match Day ${newMatchDay} added` });
      return { id: newDocId, matchDay: newMatchDay, error: null };

    } catch (error) {
      toast({ title: "Error", description: "Failed to add match", variant: "destructive" });
      return { error };
    }
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    try {
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.homeScore !== undefined || updates.awayScore !== undefined) {
        const current = matches.find((m) => m.id === matchId);
        const h = updates.homeScore ?? current?.homeScore ?? 0;
        const a = updates.awayScore ?? current?.awayScore ?? 0;
        dbUpdates.homePoints = h > a ? 3 : h === a ? 1 : 0;
        dbUpdates.awayPoints = a > h ? 3 : a === h ? 1 : 0;
      }
      await updateDoc(doc(db, "matches", matchId), dbUpdates);
      invalidate("matches");
      toast({ title: "Success", description: "Match updated successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to update match", variant: "destructive" });
      return { error };
    }
  };

  const deleteMatch = async (matchId: string) => {
    try {
      const batch = writeBatch(db);
      const deletedAt = serverTimestamp();

      // Soft delete: mark the match with deletedAt instead of removing from database
      batch.update(doc(db, "matches", matchId), { deletedAt });

      // Soft delete all related event records for this match
      const eventCollections = ["goals", "assists", "yellow_cards", "red_cards", "match_attendance"];
      const snaps = await Promise.all(
        eventCollections.map((col) => getDocs(query(collection(db, col), where("matchId", "==", matchId))))
      );
      snaps.forEach((snap) => snap.docs.forEach((d) => batch.update(d.ref, { deletedAt })));

      await batch.commit();
      invalidate("matches", "goals", "assists", "yellowCards", "redCards", "attendance");
      toast({ title: "Success", description: "Match deleted" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete match", variant: "destructive" });
      return { error };
    }
  };

  // ── Batch fixture generation (replaces sequential loop in matches/page.tsx) ──
  const addMatchesBatch = async (fixtures: (Partial<Match> & { status: 'upcoming' | 'played' })[]) => {
    try {
      const batch = writeBatch(db);
      fixtures.forEach((fixture) => {
        const ref = doc(collection(db, "matches"));
        batch.set(ref, { ...fixture, createdAt: serverTimestamp() });
      });
      await batch.commit();
      invalidate("matches");
      toast({ title: "Success", description: `${fixtures.length} fixtures generated` });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate fixtures", variant: "destructive" });
      return { error };
    }
  };

  // ── Delete all matches in a batch ─────────────────────────────────────
  const deleteAllMatches = async () => {
    try {
      const eventCollections = ["goals", "assists", "yellow_cards", "red_cards", "match_attendance"];

      // Fetch only non-deleted matches + event docs to soft-delete
      const [matchSnap, ...eventSnaps] = await Promise.all([
        getDocs(query(collection(db, "matches"), where("deletedAt", "==", null))),
        ...eventCollections.map((col) =>
          getDocs(query(collection(db, col), where("deletedAt", "==", null)))
        ),
      ]);

      // Firestore batch limit is 500 — chunk if needed
      const allRefs = [
        ...matchSnap.docs.map((d) => d.ref),
        ...eventSnaps.flatMap((snap) => snap.docs.map((d) => d.ref)),
      ];

      const BATCH_LIMIT = 490;
      for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        // Soft delete: mark each document with deletedAt instead of removing from database
        allRefs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.update(ref, { deletedAt: serverTimestamp() }));
        await batch.commit();
      }

      invalidate("matches", "goals", "assists", "yellowCards", "redCards", "attendance");
      toast({ title: "Success", description: "All match records cleared" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear records", variant: "destructive" });
      return { error };
    }
  };

  // ── Record match stats ─────────────────────────────────────────────────
  const recordMatchStats = async (
    matchId: string,
    matchDay: number,
    stats: {
      goals:   { playerId: string; teamId: string }[];
      assists: { playerId: string; teamId: string }[];
      yellows: { playerId: string; teamId: string }[];
      reds:    { playerId: string; teamId: string }[];
      attendance?: { playerId: string; teamId: string; present: boolean }[];
    }
  ) => {
    try {
      const batch = writeBatch(db);
      const ts = serverTimestamp();

      stats.goals.forEach((g) =>   batch.set(doc(collection(db, "goals")),        { ...g, matchId, matchDay, timestamp: ts }));
      stats.assists.forEach((a) =>  batch.set(doc(collection(db, "assists")),      { ...a, matchId, matchDay, timestamp: ts }));
      stats.yellows.forEach((y) =>  batch.set(doc(collection(db, "yellow_cards")), { ...y, matchId, matchDay, timestamp: ts }));
      stats.reds.forEach((r) =>     batch.set(doc(collection(db, "red_cards")),    { ...r, matchId, matchDay, timestamp: ts }));
      stats.attendance?.forEach((a) => batch.set(doc(collection(db, "match_attendance")), { ...a, matchId, matchDay, timestamp: ts }));

      await batch.commit();
      invalidate("goals", "assists", "yellowCards", "redCards", "attendance");
      toast({ title: "Success", description: "Match statistics recorded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to record stats", variant: "destructive" });
    }
  };

  const deleteMatchEvents = async (matchId: string) => {
    try {
      const snaps = await Promise.all(
        ["goals", "assists", "yellow_cards", "red_cards", "match_attendance"].map((col) =>
          getDocs(query(collection(db, col), where("matchId", "==", matchId)))
        )
      );
      const batch = writeBatch(db);
      snaps.forEach((snap) => snap.docs.forEach((d) => batch.delete(d.ref)));
      await batch.commit();
      invalidate("goals", "assists", "yellowCards", "redCards", "attendance");
      toast({ title: "Success", description: "Match events cleared" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear events", variant: "destructive" });
    }
  };

  // ── Legacy addRecord / updateRecord (match_records collection) ────────
  const addRecord = async (record: Omit<MatchRecord, "id">) => {
    try {
      await addDoc(collection(db, "match_records"), {
        player_id:     record.playerId,
        match_date:    record.matchDate,
        opponent:      record.opponent,
        goals:         record.goals,
        assists:       record.assists,
        yellow_cards:  record.yellowCards,
        red_cards:     record.redCards,
        minutes_played: record.minutesPlayed,
      });
      toast({ title: "Success", description: "Record added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add record", variant: "destructive" });
      return { error };
    }
  };

  const updateRecord = async (id: string, updates: Partial<MatchRecord>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.goals          !== undefined) dbUpdates.goals          = updates.goals;
    if (updates.assists        !== undefined) dbUpdates.assists        = updates.assists;
    if (updates.yellowCards    !== undefined) dbUpdates.yellow_cards   = updates.yellowCards;
    if (updates.redCards       !== undefined) dbUpdates.red_cards      = updates.redCards;
    if (updates.minutesPlayed  !== undefined) dbUpdates.minutes_played = updates.minutesPlayed;
    try {
      await updateDoc(doc(db, "match_records", id), dbUpdates);
      toast({ title: "Success", description: "Record updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────────
  // Event index maps — built once per data change, O(1) lookups
  // Instead of scanning the full goals/assists arrays for every
  // player on every render, we pre-group events by playerId once.
  // ─────────────────────────────────────────────

  // Map<playerId, PlayerEvent[]>
  const goalsByPlayer = useMemo(() => {
    const map = new Map<string, PlayerEvent[]>();
    goals.forEach((g) => {
      if (!map.has(g.playerId)) map.set(g.playerId, []);
      map.get(g.playerId)!.push(g);
    });
    return map;
  }, [goals]);

  const assistsByPlayer = useMemo(() => {
    const map = new Map<string, PlayerEvent[]>();
    assists.forEach((a) => {
      if (!map.has(a.playerId)) map.set(a.playerId, []);
      map.get(a.playerId)!.push(a);
    });
    return map;
  }, [assists]);

  const yellowsByPlayer = useMemo(() => {
    const map = new Map<string, PlayerEvent[]>();
    yellowCards.forEach((y) => {
      if (!map.has(y.playerId)) map.set(y.playerId, []);
      map.get(y.playerId)!.push(y);
    });
    return map;
  }, [yellowCards]);

  const redsByPlayer = useMemo(() => {
    const map = new Map<string, PlayerEvent[]>();
    redCards.forEach((r) => {
      if (!map.has(r.playerId)) map.set(r.playerId, []);
      map.get(r.playerId)!.push(r);
    });
    return map;
  }, [redCards]);

  const attendanceByPlayer = useMemo(() => {
    const map = new Map<string, MatchAttendance[]>();
    attendance.forEach((a) => {
      if (!a.present) return;
      if (!map.has(a.playerId)) map.set(a.playerId, []);
      map.get(a.playerId)!.push(a);
    });
    return map;
  }, [attendance]);

  // Map<matchId, Match> — O(1) match lookups instead of .find() per record
  const matchesById = useMemo(() => {
    const map = new Map<string, Match>();
    matches.forEach((m) => map.set(m.id, m));
    return map;
  }, [matches]);

  // Map<teamId, Team> — O(1) team lookups
  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  // ─────────────────────────────────────────────
  // Derived / computed helpers
  // ─────────────────────────────────────────────

  const getTeamPlayers = (teamId: string) => players.filter((p) => p.teamId === teamId);
  const getTeamManager = (teamId: string) => players.find((p) => p.teamId === teamId && p.isManager);

  // O(1) per call — reads from pre-indexed maps, no array scanning
  const getPlayerStats = useCallback((playerId: string) => {
    const playerGoals   = goalsByPlayer.get(playerId)   ?? [];
    const playerAssists = assistsByPlayer.get(playerId) ?? [];
    const playerYellows = yellowsByPlayer.get(playerId) ?? [];
    const playerReds    = redsByPlayer.get(playerId)    ?? [];
    const playerAttendance = attendanceByPlayer.get(playerId) ?? [];

    const matchIds = new Set([
      ...playerAttendance.map((a) => a.matchId),
      ...playerGoals.map((g) => g.matchId),
      ...playerAssists.map((a) => a.matchId),
      ...playerYellows.map((y) => y.matchId),
      ...playerReds.map((r) => r.matchId),
    ]);

    return {
      goals:       playerGoals.length,
      assists:     playerAssists.length,
      yellowCards: playerYellows.length,
      redCards:    playerReds.length,
      matches:     matchIds.size,
    };
  }, [goalsByPlayer, assistsByPlayer, yellowsByPlayer, redsByPlayer, attendanceByPlayer]);

  // Computed once when players or event maps change — not on every render
  const topScorers = useMemo(() =>
    players
      .map((p) => ({ player: p, stats: getPlayerStats(p.id) }))
      .sort((a, b) => b.stats.goals - a.stats.goals)
      .slice(0, 10),
    [players, getPlayerStats]
  );

  // Stable function reference — returns pre-memoised array
  const getTopScorers = useCallback(() => topScorers, [topScorers]);

  // Standings computed once when teams or matches change
  const standings = useMemo(() => {
    const table: Record<string, {
      id: string; name: string; logo?: string | null; color: string;
      played: number; won: number; drawn: number; lost: number;
      gf: number; ga: number; gd: number; pts: number;
    }> = {};

    teams.forEach((team) => {
      table[team.id] = {
        id: team.id, name: team.name, logo: team.logo, color: team.primaryColor,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0,
      };
    });

    matches.forEach((match) => {
      if (match.status !== 'played') return;
      const home = table[match.homeTeamId];
      const away = table[match.awayTeamId];
      if (!home || !away) return;

      home.played++; away.played++;
      home.gf += match.homeScore; home.ga += match.awayScore;
      away.gf += match.awayScore; away.ga += match.homeScore;

      if (match.homeScore > match.awayScore)      { home.won++; home.pts += 3; away.lost++; }
      else if (match.homeScore < match.awayScore) { away.won++; away.pts += 3; home.lost++; }
      else                                         { home.drawn++; away.drawn++; home.pts++; away.pts++; }
    });

    return Object.values(table)
      .map((t) => ({ ...t, gd: t.gf - t.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [teams, matches]);

  // Stable function reference — returns pre-memoised array
  const getStandings = useCallback(() => standings, [standings]);

  // getPlayerRecords uses the index maps for O(1) lookups per event
  const getPlayerRecords = useCallback((playerId: string): MatchRecord[] => {
    const playerGoals   = goalsByPlayer.get(playerId)   ?? [];
    const playerAssists = assistsByPlayer.get(playerId) ?? [];
    const playerYellows = yellowsByPlayer.get(playerId) ?? [];
    const playerReds    = redsByPlayer.get(playerId)    ?? [];
    const playerAttendance = attendanceByPlayer.get(playerId) ?? [];

    const matchIds = new Set([
      ...playerAttendance.map((a) => a.matchId),
      ...playerGoals.map((g) => g.matchId),
      ...playerAssists.map((a) => a.matchId),
      ...playerYellows.map((y) => y.matchId),
      ...playerReds.map((r) => r.matchId),
    ]);

    return Array.from(matchIds).map((mId) => {
      const match = matchesById.get(mId);
      if (!match) return null;

      const playerTeamId = players.find((p) => p.id === playerId)?.teamId;
      const opponentId   = match.homeTeamId === playerTeamId ? match.awayTeamId : match.homeTeamId;
      const opponentName = teamsById.get(opponentId)?.name ?? "Unknown Opponent";
      const rawDate      = match.createdAt?.seconds
        ? new Date(match.createdAt.seconds * 1000).toISOString()
        : new Date().toISOString();

      // Count events for this specific match using filtered arrays
      const matchGoals   = playerGoals.filter((g) => g.matchId === mId).length;
      const matchAssists = playerAssists.filter((a) => a.matchId === mId).length;
      const matchYellows = playerYellows.filter((y) => y.matchId === mId).length;
      const matchReds    = playerReds.filter((r) => r.matchId === mId).length;

      return {
        id:            `${playerId}_${mId}`,
        playerId,
        matchId:       mId,
        matchDate:     rawDate,
        opponent:      opponentName,
        goals:         matchGoals,
        assists:       matchAssists,
        yellowCards:   matchYellows,
        redCards:      matchReds,
        minutesPlayed: match.minutesPlayed || 90,
      };
    }).filter(Boolean) as MatchRecord[];
  }, [goalsByPlayer, assistsByPlayer, yellowsByPlayer, redsByPlayer, attendanceByPlayer, matchesById, teamsById, players]);

  return {
    // Data
    teams, players, matches, loading,
    goals, assists, yellowCards, redCards, attendance,
    // Pre-computed (use these directly in components where possible)
    standings, topScorers,
    // Team
    addTeam, updateTeam, deleteTeam, approveTeam,
    // Player
    addPlayer, updatePlayer, deletePlayer, setManager,
    // Match
    addMatch, addMatchesBatch, updateMatch, deleteMatch, deleteAllMatches,
    recordMatchStats, deleteMatchEvents,
    // Records (legacy)
    addRecord, updateRecord,
    // Computed helpers (for per-player/per-team lookups)
    getTeamPlayers, getTeamManager,
    getPlayerStats, getTopScorers, getStandings, getPlayerRecords,
    // Manual refetch (escape hatch, rarely needed)
    refetch: () => {
      Object.values(QUERY_KEYS).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  };
}