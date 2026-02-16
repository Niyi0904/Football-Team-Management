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
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/app/hooks/use-toast";

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
  status: 'upcoming' | 'played';
  scheduledDate?: string;
}

export interface PlayerEvent {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: any;
}

export function useAppData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [goals, setGoals] = useState<PlayerEvent[]>([]);
  const [assists, setAssists] = useState<PlayerEvent[]>([]);
  const [yellowCards, setYellowCards] = useState<PlayerEvent[]>([]);
  const [redCards, setRedCards] = useState<PlayerEvent[]>([]);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsSnap, playersSnap, matchesSnap, goalsSnap, assistsSnap, yellowsSnap, redsSnap] = await Promise.all([
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "players")),
        getDocs(query(collection(db, "matches"), orderBy("matchDay", "desc"))),
        getDocs(collection(db, "goals")),
        getDocs(collection(db, "assists")),
        getDocs(collection(db, "yellow_cards")),
        getDocs(collection(db, "red_cards")),
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

      if (matchesSnap) {
        setMatches(matchesSnap.docs.map((d) => {
          const m: any = d.data();
          return {
            id: d.id,
            ...m
          } as Match;
        }));
      }

      setGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerEvent)));
      setAssists(assistsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerEvent)));
      setYellowCards(yellowsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerEvent)));
      setRedCards(redsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerEvent)));

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
      toast({ title: "Success", description: "Team added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add team", variant: "destructive" });
      return { error };
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const teamRef = doc(db, "teams", id);
      const dbUpdates: any = { ...updates };
      if (updates.primaryColor) {
        dbUpdates.primary_color = updates.primaryColor;
        delete dbUpdates.primaryColor;
      }
      await updateDoc(teamRef, dbUpdates);
      await fetchData();
      toast({ title: "Success", description: "Team updated successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to update team", variant: "destructive" });
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
      await deleteDoc(doc(db, "teams", teamId));
      await fetchData();
      toast({ title: "Success", description: "Team deleted successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete team", variant: "destructive" });
      return { error: "Failed to delete from database" };
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
      toast({ title: "Success", description: "Player added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add player", variant: "destructive" });
      return { error };
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    try {
      const playerRef = doc(db, "players", id);
      const dbUpdates: any = { ...updates };
      if (updates.teamId) {
        dbUpdates.team_id = updates.teamId;
        delete dbUpdates.teamId;
      }
      if (updates.isManager !== undefined) {
        dbUpdates.is_manager = updates.isManager;
        delete dbUpdates.isManager;
      }
      await updateDoc(playerRef, dbUpdates);
      await fetchData();
      toast({ title: "Success", description: "Player updated successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to update player", variant: "destructive" });
      return { error };
    }
  };

  const deletePlayer = async (id: string) => {
    try {
      const playerRef = doc(db, "players", id);
      await deleteDoc(playerRef);
      await fetchData();
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
      await batch.commit();

      const playerDocRef = doc(db, "players", playerId);
      await updateDoc(playerDocRef, { is_manager: true });
      await fetchData();
      toast({ title: "Success", description: "Manager assigned successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign manager", variant: "destructive" });
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
      toast({ title: "Success", description: "Record added successfully" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add record", variant: "destructive" });
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
      toast({ title: "Success", description: "Record updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    }
  };

  const addMatch = async (matchData: any) => {
    try {
      const matchesRef = collection(db, "matches");
      let matchDay = matchData.matchDay;
      if (!matchDay) {
        const q = query(matchesRef, orderBy("matchDay", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        matchDay = !querySnapshot.empty ? querySnapshot.docs[0].data().matchDay + 1 : 1;
      }

      let homePoints = 0;
      let awayPoints = 0;

      if (matchData.status === 'played') {
        const h = matchData.homeScore || 0;
        const a = matchData.awayScore || 0;
        if (h > a) homePoints = 3;
        else if (h < a) awayPoints = 3;
        else { homePoints = 1; awayPoints = 1; }
      } 

      const docRef = await addDoc(matchesRef, {
        ...matchData,
        matchDay,
        homePoints,
        awayPoints,
        createdAt: serverTimestamp(),
      });

      await fetchData(); 
      toast({ title: "Success", description: `Match Day ${matchDay} added` });
      return { id: docRef.id, matchDay, error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to add match", variant: "destructive" });
      return { error };
    }
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      const dbUpdates: any = { ...updates };
      if (updates.homeScore !== undefined || updates.awayScore !== undefined) {
        const h = updates.homeScore ?? matches.find(m => m.id === matchId)?.homeScore ?? 0;
        const a = updates.awayScore ?? matches.find(m => m.id === matchId)?.awayScore ?? 0;
        dbUpdates.homePoints = h > a ? 3 : h === a ? 1 : 0;
        dbUpdates.awayPoints = a > h ? 3 : a === h ? 1 : 0;
      }

      await updateDoc(matchRef, dbUpdates);
      await fetchData();
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
      batch.delete(doc(db, "matches", matchId));
      const collectionsToClean = ["goals", "assists", "yellow_cards", "red_cards"];
      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where("matchId", "==", matchId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
      }
      await batch.commit();
      await fetchData();
      toast({ title: "Success", description: "Match deleted" });
      return { error: null };
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete match", variant: "destructive" });
      return { error };
    }
  };

  const recordMatchStats = async (matchId: string, matchDay: number, stats: {
    goals: { playerId: string, teamId: string }[],
    assists: { playerId: string, teamId: string }[],
    yellows: { playerId: string, teamId: string }[],
    reds: { playerId: string, teamId: string }[]
  }) => {
    try {
      const batch = writeBatch(db);
      stats.goals.forEach(g => {
        const ref = doc(collection(db, "goals"));
        batch.set(ref, { ...g, matchId, matchDay, timestamp: serverTimestamp() });
      });
      stats.assists.forEach(a => {
        const ref = doc(collection(db, "assists"));
        batch.set(ref, { ...a, matchId, matchDay, timestamp: serverTimestamp() });
      });
      stats.yellows.forEach(y => {
        const ref = doc(collection(db, "yellow_cards"));
        batch.set(ref, { ...y, matchId, matchDay, timestamp: serverTimestamp() });
      });
      stats.reds.forEach(r => {
        const ref = doc(collection(db, "red_cards"));
        batch.set(ref, { ...r, matchId, matchDay, timestamp: serverTimestamp() });
      });
      await batch.commit();
      await fetchData();
      toast({ title: "Success", description: "Match statistics recorded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to record stats", variant: "destructive" });
    }
  };

  const deleteMatchEvents = async (matchId: string) => {
    try {
      const batch = writeBatch(db);
      const collections = ["goals", "assists", "yellow_cards", "red_cards"];
      for (const col of collections) {
        const q = query(collection(db, col), where("matchId", "==", matchId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
      toast({ title: "Success", description: "Match events cleared" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear events", variant: "destructive" });
    }
  };
  
  const getTeamPlayers = (teamId: string) => players.filter((p) => p.teamId === teamId);
  const getTeamManager = (teamId: string) => players.find((p) => p.teamId === teamId && p.isManager);

  const getPlayerRecords = (playerId: string): MatchRecord[] => {
    const matchIds = new Set([
      ...goals.filter(g => g.playerId === playerId).map(g => g.matchId),
      ...assists.filter(a => a.playerId === playerId).map(a => a.matchId),
      ...yellowCards.filter(y => y.playerId === playerId).map(y => y.matchId),
      ...redCards.filter(r => r.playerId === playerId).map(r => r.matchId)
    ]);

    return Array.from(matchIds).map(mId => {
      const match = matches.find(m => m.id === mId);
      if (!match) return null;
      const playerTeamId = players.find(p => p.id === playerId)?.teamId;
      const opponentId = match.homeTeamId === playerTeamId ? match.awayTeamId : match.homeTeamId;
      const opponentName = teams.find(t => t.id === opponentId)?.name || "Unknown Opponent";
      const rawDate = match.createdAt?.seconds 
        ? new Date(match.createdAt.seconds * 1000).toISOString() 
        : new Date().toISOString();

      return {
        id: `${playerId}_${mId}`,
        playerId,
        matchDate: rawDate, 
        opponent: opponentName,
        goals: goals.filter(g => g.playerId === playerId && g.matchId === mId).length,
        assists: assists.filter(a => a.playerId === playerId && a.matchId === mId).length,
        yellowCards: yellowCards.filter(y => y.playerId === playerId && y.matchId === mId).length,
        redCards: redCards.filter(r => r.playerId === playerId && r.matchId === mId).length,
        minutesPlayed: match.minutesPlayed || 90,
      };
    }).filter(Boolean) as MatchRecord[];
  };

  const getPlayerStats = (playerId: string) => {
    return {
      goals: goals.filter(g => g.playerId === playerId).length,
      assists: assists.filter(a => a.playerId === playerId).length,
      yellowCards: yellowCards.filter(y => y.playerId === playerId).length,
      redCards: redCards.filter(r => r.playerId === playerId).length,
      matches: new Set([...goals, ...assists, ...yellowCards, ...redCards]
        .filter(e => e.playerId === playerId)
        .map(e => e.matchId)).size
    };
  };

  const getTopScorers = () => {
    return players
      .map((p) => ({ player: p, stats: getPlayerStats(p.id) }))
      .sort((a, b) => b.stats.goals - a.stats.goals)
      .slice(0, 10);
  };

  const getStandings = () => {
    const table: Record<string, any> = {};
    teams.forEach((team) => {
      table[team.id] = {
        id: team.id,
        name: team.name,
        logo: team.logo,
        color: team.primaryColor,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0,
      };
    });

    matches.forEach((match) => {
      if (match.status !== 'played') return;
      const home = table[match.homeTeamId];
      const away = table[match.awayTeamId];
      if (home && away) {
        home.played += 1; away.played += 1;
        home.gf += match.homeScore; home.ga += match.awayScore;
        away.gf += match.awayScore; away.ga += match.homeScore;

        if (match.homeScore > match.awayScore) {
          home.won += 1; home.pts += 3; away.lost += 1;
        } else if (match.homeScore < match.awayScore) {
          away.won += 1; away.pts += 3; home.lost += 1;
        } else {
          home.drawn += 1; away.drawn += 1; home.pts += 1; away.pts += 1;
        }
      }
    });

    return Object.values(table)
      .map((team: any) => ({ ...team, gd: team.gf - team.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  return {
    teams, players, matches, loading, goals, assists, yellowCards, redCards, 
    addTeam, updateTeam, deleteTeam, addPlayer, updatePlayer, deletePlayer, setManager, recordMatchStats,
    addRecord, updateRecord, addMatch, updateMatch, deleteMatch, deleteMatchEvents,
    getTeamPlayers, getStandings, getTeamManager, getPlayerRecords, getPlayerStats, getTopScorers,
    refetch: fetchData,
  };
}