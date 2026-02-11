import { useState, useEffect, useCallback } from "react";
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
} from "firebase/firestore";

export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  teamId: string;
  isManager: boolean;
  photo?: string | null;
}

export interface Team {
  id: string;
  name: string;
  logo?: string | null;
  primaryColor: string;
  founded: string;
  stadium: string;
}

export interface MatchRecord {
  id: string;
  playerId: string;
  matchDate: string;
  opponent: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

export function useAppData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsSnap, playersSnap, recordsSnap] = await Promise.all([
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "players")),
        getDocs(collection(db, "match_records")),
      ]);

      if (teamsSnap) {
        setTeams(teamsSnap.docs.map((d) => {
          const t: any = d.data();
          return {
            id: d.id,
            name: t.name,
            logo: t.logo,
            primaryColor: t.primary_color ?? t.primaryColor ?? "",
            founded: t.founded ?? "",
            stadium: t.stadium ?? "",
          } as Team;
        }));
      }

      if (playersSnap) {
        setPlayers(playersSnap.docs.map((d) => {
          const p: any = d.data();
          return {
            id: d.id,
            name: p.name,
            position: p.position,
            number: p.number,
            teamId: p.team_id ?? p.teamId,
            isManager: p.is_manager ?? p.isManager ?? false,
            photo: p.photo ?? null,
          } as Player;
        }));
      }

      if (recordsSnap) {
        setRecords(recordsSnap.docs.map((d) => {
          const r: any = d.data();
          return {
            id: d.id,
            playerId: r.player_id ?? r.playerId,
            matchDate: r.match_date ?? r.matchDate,
            opponent: r.opponent,
            goals: r.goals ?? 0,
            assists: r.assists ?? 0,
            yellowCards: r.yellow_cards ?? r.yellowCards ?? 0,
            redCards: r.red_cards ?? r.redCards ?? 0,
            minutesPlayed: r.minutes_played ?? r.minutesPlayed ?? 0,
          } as MatchRecord;
        }));
      }
    } catch (err) {
      console.error("fetchData error", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTeam = async (team: Omit<Team, "id">) => {
    try {
      await addDoc(collection(db, "teams"), {
        name: team.name,
        stadium: team.stadium,
        founded: team.founded,
        primary_color: team.primaryColor,
        logo: team.logo ?? null,
      });
      await fetchData();
      return { error: null };
    } catch (error) {
      console.error("addTeam error", error);
      return { error };
    }
  };

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
      await fetchData();
      return { error: null };
    } catch (error) {
      console.error("addPlayer error", error);
      return { error };
    }
  };

  const setManager = async (teamId: string, playerId: string) => {
    try {
      // Unset all managers for the team
      const q = query(collection(db, "players"), where("team_id", "==", teamId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { is_manager: false }));
      await batch.commit();

      // Set the selected player as manager
      const playerDocRef = doc(db, "players", playerId);
      await updateDoc(playerDocRef, { is_manager: true });
      await fetchData();
    } catch (error) {
      console.error("setManager error", error);
    }
  };

  const addRecord = async (record: Omit<MatchRecord, "id">) => {
    try {
      await addDoc(collection(db, "match_records"), {
        player_id: record.playerId,
        match_date: record.matchDate,
        opponent: record.opponent,
        goals: record.goals,
        assists: record.assists,
        yellow_cards: record.yellowCards,
        red_cards: record.redCards,
        minutes_played: record.minutesPlayed,
      });
      await fetchData();
      return { error: null };
    } catch (error) {
      console.error("addRecord error", error);
      return { error };
    }
  };

  const updateRecord = async (id: string, updates: Partial<MatchRecord>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
    if (updates.assists !== undefined) dbUpdates.assists = updates.assists;
    if (updates.yellowCards !== undefined) dbUpdates.yellow_cards = updates.yellowCards;
    if (updates.redCards !== undefined) dbUpdates.red_cards = updates.redCards;
    if (updates.minutesPlayed !== undefined) dbUpdates.minutes_played = updates.minutesPlayed;
    try {
      const recRef = doc(db, "match_records", id);
      await updateDoc(recRef, dbUpdates as any);
      await fetchData();
    } catch (error) {
      console.error("updateRecord error", error);
    }
  };

  const getTeamPlayers = (teamId: string) => players.filter((p) => p.teamId === teamId);
  const getTeamManager = (teamId: string) => players.find((p) => p.teamId === teamId && p.isManager);
  const getPlayerRecords = (playerId: string) => records.filter((r) => r.playerId === playerId);

  const getPlayerStats = (playerId: string) => {
    const playerRecords = getPlayerRecords(playerId);
    return {
      goals: playerRecords.reduce((s, r) => s + r.goals, 0),
      assists: playerRecords.reduce((s, r) => s + r.assists, 0),
      yellowCards: playerRecords.reduce((s, r) => s + r.yellowCards, 0),
      redCards: playerRecords.reduce((s, r) => s + r.redCards, 0),
      matches: playerRecords.length,
      minutesPlayed: playerRecords.reduce((s, r) => s + r.minutesPlayed, 0),
    };
  };

  const getTopScorers = () => {
    return players
      .map((p) => ({ player: p, stats: getPlayerStats(p.id) }))
      .sort((a, b) => b.stats.goals - a.stats.goals)
      .slice(0, 10);
  };

  return {
    teams, players, records, loading,
    addTeam, addPlayer, setManager,
    addRecord, updateRecord,
    getTeamPlayers, getTeamManager, getPlayerRecords, getPlayerStats, getTopScorers,
    refetch: fetchData,
  };
}
