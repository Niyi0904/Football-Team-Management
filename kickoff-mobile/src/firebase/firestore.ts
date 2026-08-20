import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import {
  mapTeam,
  mapPlayer,
  mapMatch,
  mapPlayerEvent,
  mapLeagueSettings,
  DEFAULT_LEAGUE_SETTINGS,
  type PlayerEvent,
} from '../lib/firestoreMappers';
import type { Team, Player, Match, PlayerStats, TeamStanding, LeagueSettings, User, RoleType, LinkRequest, LinkRequestStatus, Suspension } from '../lib/types';

export type { PlayerEvent };

export const fetchTeams = async (): Promise<Team[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'teams'));
    return snapshot.docs.map((d) => mapTeam(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.error('Fetch teams error:', error);
    return [];
  }
};

export const fetchTeamById = async (teamId: string): Promise<Team | null> => {
  try {
    const ref = doc(db, 'teams', teamId);
    const snap = await getDoc(ref);
    return snap.exists() ? mapTeam(snap.id, snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    console.error('Fetch team by ID error:', error);
    return null;
  }
};

export const fetchPlayers = async (teamId?: string): Promise<Player[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    if (teamId) {
      constraints.push(where('team_id', '==', teamId));
    }
    const ref = constraints.length
      ? query(collection(db, 'players'), ...constraints)
      : query(collection(db, 'players'), orderBy('name', 'asc'));
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((d) => mapPlayer(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.error('Fetch players error:', error);
    return [];
  }
};

export const fetchPlayerById = async (playerId: string): Promise<Player | null> => {
  try {
    const snap = await getDoc(doc(db, 'players', playerId));
    return snap.exists() ? mapPlayer(snap.id, snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    console.error('Fetch player by ID error:', error);
    return null;
  }
};

export const fetchMatches = async (status?: string): Promise<Match[]> => {
  try {
    const constraints: QueryConstraint[] = [orderBy('matchDay', 'desc')];
    if (status) {
      constraints.unshift(where('status', '==', status));
    }
    const snapshot = await getDocs(query(collection(db, 'matches'), ...constraints));
    return snapshot.docs.map((d) => mapMatch(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.error('Fetch matches error:', error);
    return [];
  }
};

export const fetchMatchById = async (matchId: string): Promise<Match | null> => {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    return snap.exists() ? mapMatch(snap.id, snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    console.error('Fetch match by ID error:', error);
    return null;
  }
};

async function fetchEvents(collectionName: string): Promise<PlayerEvent[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((d) => mapPlayerEvent(d.id, d.data() as Record<string, unknown>));
}

export const fetchGoals = () => fetchEvents('goals');
export const fetchAssists = () => fetchEvents('assists');
export const fetchYellowCards = () => fetchEvents('yellow_cards');
export const fetchRedCards = () => fetchEvents('red_cards');

export const fetchMatchEvents = async (matchId: string) => {
  const filterByMatch = async (col: string) => {
    const snap = await getDocs(query(collection(db, col), where('matchId', '==', matchId)));
    return snap.docs.map((d) => mapPlayerEvent(d.id, d.data() as Record<string, unknown>));
  };
  const [goals, assists, yellows, reds] = await Promise.all([
    filterByMatch('goals'),
    filterByMatch('assists'),
    filterByMatch('yellow_cards'),
    filterByMatch('red_cards'),
  ]);
  return { goals, assists, yellows, reds };
};

export const fetchPlayerStats = async (): Promise<PlayerStats[]> => {
  try {
    const [teams, players, goals, assists, yellows, reds] = await Promise.all([
      fetchTeams(),
      fetchPlayers(),
      fetchGoals(),
      fetchAssists(),
      fetchYellowCards(),
      fetchRedCards(),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const statsMap = new Map<string, PlayerStats>();

    const ensure = (playerId: string, teamId: string) => {
      if (!statsMap.has(playerId)) {
        const player = playerMap.get(playerId);
        const team = teamMap.get(teamId) ?? teamMap.get(player?.teamId ?? '');
        statsMap.set(playerId, {
          playerId,
          playerName: player?.name ?? 'Unknown',
          teamId: teamId || player?.teamId || '',
          teamName: team?.name ?? '',
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        });
      }
      return statsMap.get(playerId)!;
    };

    goals.forEach((g) => { ensure(g.playerId, g.teamId).goals += 1; });
    assists.forEach((a) => { ensure(a.playerId, a.teamId).assists += 1; });
    yellows.forEach((y) => { ensure(y.playerId, y.teamId).yellowCards += 1; });
    reds.forEach((r) => { ensure(r.playerId, r.teamId).redCards += 1; });

    return Array.from(statsMap.values()).sort((a, b) => b.goals - a.goals);
  } catch (error) {
    console.error('Fetch player stats error:', error);
    return [];
  }
};

export const getPlayerStatsForId = (
  playerId: string,
  goals: PlayerEvent[],
  assists: PlayerEvent[],
  yellows: PlayerEvent[],
  reds: PlayerEvent[],
) => {
  const matchIds = new Set<string>();
  [...goals, ...assists, ...yellows, ...reds]
    .filter((e) => e.playerId === playerId)
    .forEach((e) => matchIds.add(e.matchId));

  return {
    goals: goals.filter((g) => g.playerId === playerId).length,
    assists: assists.filter((a) => a.playerId === playerId).length,
    yellowCards: yellows.filter((y) => y.playerId === playerId).length,
    redCards: reds.filter((r) => r.playerId === playerId).length,
    matches: matchIds.size,
  };
};

export const fetchLeagueStandings = async (): Promise<TeamStanding[]> => {
  try {
    const [teams, matchesSnapshot] = await Promise.all([
      fetchTeams(),
      getDocs(query(collection(db, 'matches'), where('status', '==', 'played'))),
    ]);

    const standingsMap = new Map<string, TeamStanding>();
    teams.forEach((team) => {
      standingsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 0,
      });
    });

    matchesSnapshot.docs.forEach((docSnap) => {
      const match = mapMatch(docSnap.id, docSnap.data() as Record<string, unknown>);
      const home = standingsMap.get(match.homeTeamId);
      const away = standingsMap.get(match.awayTeamId);
      if (!home || !away) return;

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;
      home.points += match.homePoints;
      away.points += match.awayPoints;

      if (match.homePoints === 3) home.wins += 1;
      else if (match.homePoints === 1) home.draws += 1;
      else home.losses += 1;

      if (match.awayPoints === 3) away.wins += 1;
      else if (match.awayPoints === 1) away.draws += 1;
      else away.losses += 1;
    });

    standingsMap.forEach((s) => {
      s.goalDifference = s.goalsFor - s.goalsAgainst;
    });

    const sorted = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    sorted.forEach((s, i) => { s.position = i + 1; });
    return sorted;
  } catch (error) {
    console.error('Fetch league standings error:', error);
    return [];
  }
};

export const fetchLeagueSettings = async (): Promise<LeagueSettings> => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'league'));
    return snap.exists()
      ? mapLeagueSettings(snap.data() as Record<string, unknown>)
      : DEFAULT_LEAGUE_SETTINGS;
  } catch (error) {
    console.error('Fetch league settings error:', error);
    return DEFAULT_LEAGUE_SETTINGS;
  }
};
import { addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/** Add a new team */
export const addTeam = async (teamData: Omit<Team, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      ...teamData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Add team error:', error);
    return null;
  }
};

/** Update existing team */
export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<boolean> => {
  try {
    const ref = doc(db, 'teams', teamId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Update team error:', error);
    return false;
  }
};

/** Delete a team */
export const deleteTeam = async (teamId: string): Promise<boolean> => {
  try {
    const ref = doc(db, 'teams', teamId);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error('Delete team error:', error);
    return false;
  }
};

/** Update league settings */
export const updateLeagueSettings = async (settings: Partial<LeagueSettings>): Promise<boolean> => {
  try {
    const ref = doc(db, 'settings', 'league');
    await setDoc(ref, { ...settings }, { merge: true });
    return true;
  } catch (error) {
    console.error('Update league settings error:', error);
    return false;
  }
};

/** Add a new player */
export const addPlayer = async (playerData: Omit<Player, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'players'), {
      ...playerData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Add player error:', error);
    return null;
  }
};

/** Update existing player */
export const updatePlayer = async (playerId: string, updates: Partial<Player>): Promise<boolean> => {
  try {
    const ref = doc(db, 'players', playerId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Update player error:', error);
    return false;
  }
};

/** Delete a player */
export const deletePlayer = async (playerId: string): Promise<boolean> => {
  try {
    const ref = doc(db, 'players', playerId);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error('Delete player error:', error);
    return false;
  }
};

/** Add a new match */
export const addMatch = async (matchData: Omit<Match, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'matches'), {
      ...matchData,
      deletedAt: null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Add match error:', error);
    return null;
  }
};

/** Update existing match */
export const updateMatch = async (matchId: string, updates: Partial<Match>): Promise<boolean> => {
  try {
    const ref = doc(db, 'matches', matchId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Update match error:', error);
    return false;
  }
};

// ── Player Linking ─────────────────────────────────────────────

/** Claim a player profile by linking it to the current user */
export const claimPlayerProfile = async (playerId: string, userId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'players', playerId), { linkedUserId: userId });
    await updateDoc(doc(db, 'user_roles', userId), { playerId });
    return true;
  } catch (error) {
    console.error('Claim player profile error:', error);
    return false;
  }
};

/** Unlink a player profile */
export const unlinkPlayerProfile = async (playerId: string, userId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'players', playerId), { linkedUserId: null });
    await updateDoc(doc(db, 'user_roles', userId), { playerId: null });
    return true;
  } catch (error) {
    console.error('Unlink player profile error:', error);
    return false;
  }
};

/** Fetch unclaimed players for a team */
export const fetchUnclaimedPlayers = async (teamId?: string): Promise<Player[]> => {
  try {
    const constraints: QueryConstraint[] = [where('linkedUserId', '==', null)];
    if (teamId) {
      constraints.push(where('team_id', '==', teamId));
    }
    const snapshot = await getDocs(query(collection(db, 'players'), ...constraints));
    return snapshot.docs.map((d) => mapPlayer(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.error('Fetch unclaimed players error:', error);
    return [];
  }
};

// ── Match Event Mutations ──────────────────────────────────────

type EventCollection = 'goals' | 'assists' | 'yellow_cards' | 'red_cards';

interface BaseEvent {
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
}

/** Add a match event (goal, assist, yellow, red) */
export const addMatchEvent = async (
  collectionName: EventCollection,
  event: BaseEvent & { minute?: number },
): Promise<string | null> => {
  try {
    let leagueId: string | undefined;
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      const roleSnap = await getDoc(doc(db, 'user_roles', currentUser.uid));
      leagueId = roleSnap.exists() ? roleSnap.data()?.leagueId : undefined;
    }

    const docRef = await addDoc(collection(db, collectionName), {
      ...event,
      minute: event.minute ?? 0,
      timestamp: serverTimestamp(),
      deletedAt: null,
      ...(leagueId ? { leagueId } : {}),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Add ${collectionName} error:`, error);
    return null;
  }
};

/** Delete a match event */
export const deleteMatchEvent = async (
  collectionName: EventCollection,
  eventId: string,
): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, collectionName, eventId));
    return true;
  } catch (error) {
    console.error(`Delete ${collectionName} error:`, error);
    return false;
  }
};

/** Delete all events for a match (used before re-recording) */
export const clearMatchEvents = async (matchId: string): Promise<boolean> => {
  try {
    const collections: EventCollection[] = ['goals', 'assists', 'yellow_cards', 'red_cards'];
    await Promise.all(
      collections.map(async (col) => {
        const snap = await getDocs(query(collection(db, col), where('matchId', '==', matchId)));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, col, d.id))));
      }),
    );
    return true;
  } catch (error) {
    console.error('Clear match events error:', error);
    return false;
  }
};

// ── Admin: User Management ─────────────────────────────────────

export const fetchAllUsers = async (): Promise<(User & { role?: string })[]> => {
  try {
    const [userSnap, roleSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'user_roles')),
    ]);
    const roleMap = new Map(roleSnap.docs.map(d => [d.id, d.data().role as string]));
    return userSnap.docs.map(d => {
      const data = d.data() as User;
      return { ...data, id: d.id, role: roleMap.get(d.id) ?? 'player' };
    });
  } catch (error) {
    console.error('Fetch all users error:', error);
    return [];
  }
};

export const updateUserRole = async (uid: string, role: RoleType): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'user_roles', uid), { uid, role }, { merge: true });
    return true;
  } catch (error) {
    console.error('Update user role error:', error);
    return false;
  }
};

// ── Admin: Link Requests ───────────────────────────────────────

export const fetchLinkRequests = async (status?: LinkRequestStatus): Promise<LinkRequest[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    if (status) constraints.push(where('status', '==', status));
    const snapshot = await getDocs(
      constraints.length
        ? query(collection(db, 'link_requests'), ...constraints, orderBy('createdAt', 'desc'))
        : query(collection(db, 'link_requests'), orderBy('createdAt', 'desc')),
    );
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LinkRequest));
  } catch (error) {
    console.error('Fetch link requests error:', error);
    return [];
  }
};

export const createLinkRequest = async (playerId: string, userId: string, userEmail?: string): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'link_requests'), {
      playerId,
      userId,
      userEmail,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Create link request error:', error);
    return null;
  }
};

export const updateLinkRequestStatus = async (requestId: string, status: LinkRequestStatus): Promise<boolean> => {
  try {
    const ref = doc(db, 'link_requests', requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    await updateDoc(ref, { status });

    if (status === 'approved' && data.playerId && data.userId) {
      await updateDoc(doc(db, 'players', data.playerId), { linkedUserId: data.userId });
      await updateDoc(doc(db, 'user_roles', data.userId), { playerId: data.playerId });
    }
    return true;
  } catch (error) {
    console.error('Update link request error:', error);
    return false;
  }
};

// ── Admin: Suspensions ─────────────────────────────────────────

export const fetchSuspensions = async (activeOnly?: boolean): Promise<Suspension[]> => {
  try {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (activeOnly) constraints.unshift(where('active', '==', true));
    const snapshot = await getDocs(query(collection(db, 'suspensions'), ...constraints));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Suspension));
  } catch (error) {
    console.error('Fetch suspensions error:', error);
    return [];
  }
};

export const createSuspension = async (data: Omit<Suspension, 'id' | 'createdAt'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, 'suspensions'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Create suspension error:', error);
    return null;
  }
};

export const endSuspension = async (suspensionId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'suspensions', suspensionId), { active: false });
    return true;
  } catch (error) {
    console.error('End suspension error:', error);
    return false;
  }
};

/** Delete a match */
export const deleteMatch = async (matchId: string): Promise<boolean> => {
  try {
    const ref = doc(db, 'matches', matchId);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error('Delete match error:', error);
    return false;
  }
};
