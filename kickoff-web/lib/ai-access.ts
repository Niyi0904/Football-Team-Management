// lib/ai-access.ts
// Core AI data-access layer — uses Firebase Admin SDK for trusted server-side reads.
// Every function validates leagueId against the actual leagues collection.
// This is the single source of data logic; REST routes and MCP tools call these functions.

import {
  initializeApp,
  getApps,
  cert,
  type App,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────
// Lazy Firebase Admin singleton
// ─────────────────────────────────────────────

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (rawKey && clientEmail && projectId) {
    const privateKey = rawKey
      .replace(/^"|"$/g, '')
      .replace(/\\n/g, '\n');
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return initializeApp();
}

function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

// ─────────────────────────────────────────────
// API-key check
// ─────────────────────────────────────────────

const AI_ACCESS_API_KEY_VAR = 'AI_ACCESS_API_KEY';

export function checkApiKey(authHeader: string | null): void {
  const expected = process.env[AI_ACCESS_API_KEY_VAR];
  if (!expected) {
    throw new Error('AI_ACCESS_API_KEY is not configured on the server.');
  }
  if (!authHeader) {
    throw new Error('Missing Authorization header.');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== expected) {
    throw new Error('Invalid API key.');
  }
}

// ─────────────────────────────────────────────
// League validation
// ─────────────────────────────────────────────

async function validateLeague(db: Firestore, leagueId: string): Promise<void> {
  // Since there is no standalone 'leagues' collection, we treat the league
  // as the settings/league document — the singleton that holds season info.
  const snap = await db.collection('settings').doc('league').get();
  if (!snap.exists) {
    throw new Error(`League "${leagueId}" not found.`);
  }
  // If leagueId is provided meaningfully, we still validate against the doc.
  // For now the league doc is at settings/league; the id is always 'league'.
  // In a future with multiple leagues, you would look up db.collection('leagues').doc(leagueId).
  if (leagueId !== 'league') {
    // Accept both 'league' and the actual document id for flexibility.
    const leagueSnap = await db.collection('leagues').doc(leagueId).get();
    if (!leagueSnap.exists) {
      throw new Error(`League with id "${leagueId}" not found.`);
    }
  }
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface LeagueSummary {
  name: string;
  season: string;
  teamCount: number;
  playerCount: number;
}

export interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  logo?: string | null;
  color: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface MatchSummary {
  id: string;
  matchDay: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledDate?: string;
  time?: string;
}

export interface TopScorerEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  position: string;
  number: number;
  isManager: boolean;
  photo?: string | null;
}

// ─────────────────────────────────────────────
// Core data functions
// ─────────────────────────────────────────────

export async function getLeagueSummary(leagueId: string): Promise<LeagueSummary> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  const leagueSnap = await db.collection('settings').doc('league').get();
  const leagueData = leagueSnap.data() ?? {};

  // Count teams and players from their collections
  const teamsSnap = await db.collection('teams').get();
  const playersSnap = await db.collection('players').get();

  return {
    name: leagueData.seasonName ?? 'Current Season',
    season: leagueData.seasonName ?? 'Current Season',
    teamCount: teamsSnap.size,
    playerCount: playersSnap.size,
  };
}

export async function getStandings(leagueId: string): Promise<StandingRow[]> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  // Fetch all teams and matches
  const teamsSnap = await db.collection('teams').get();
  const matchesSnap = await db.collection('matches').get();

  const teams: Record<string, { id: string; name: string; logo?: string | null; primaryColor: string }> = {};
  teamsSnap.forEach((doc) => {
    const t = doc.data();
    teams[doc.id] = {
      id: doc.id,
      name: t.name ?? 'Unknown',
      logo: t.logo ?? null,
      primaryColor: t.primary_color ?? t.primaryColor ?? '',
    };
  });

  type Row = {
    id: string; name: string; logo?: string | null; color: string;
    played: number; won: number; drawn: number; lost: number;
    gf: number; ga: number; gd: number; pts: number;
  };

  const table: Record<string, Row> = {};
  for (const [id, t] of Object.entries(teams)) {
    table[id] = {
      id, name: t.name, logo: t.logo, color: t.primaryColor,
      played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    };
  }

  matchesSnap.forEach((doc) => {
    const m = doc.data();
    if (m.status !== 'played') return;
    const home = table[m.homeTeamId];
    const away = table[m.awayTeamId];
    if (!home || !away) return;

    home.played++; away.played++;
    home.gf += m.homeScore ?? 0; home.ga += m.awayScore ?? 0;
    away.gf += m.awayScore ?? 0; away.ga += m.homeScore ?? 0;

    if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) {
      home.won++; home.pts += 3; away.lost++;
    } else if ((m.homeScore ?? 0) < (m.awayScore ?? 0)) {
      away.won++; away.pts += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.pts++; away.pts++;
    }
  });

  return Object.values(table)
    .map((t) => ({ ...t, gd: t.gf - t.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      teamName: t.name,
      logo: t.logo,
      color: t.color,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      gf: t.gf,
      ga: t.ga,
      gd: t.gd,
      pts: t.pts,
    }));
}

export async function getRecentResults(leagueId: string, limit = 10): Promise<MatchSummary[]> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  const teamsSnap = await db.collection('teams').get();
  const teamNames: Record<string, string> = {};
  teamsSnap.forEach((doc) => {
    teamNames[doc.id] = doc.data().name ?? 'Unknown';
  });

  const snap = await db.collection('matches')
    .where('status', '==', 'played')
    .orderBy('matchDay', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const m = doc.data();
    return {
      id: doc.id,
      matchDay: m.matchDay,
      homeTeamId: m.homeTeamId,
      homeTeamName: teamNames[m.homeTeamId] ?? 'Unknown',
      awayTeamId: m.awayTeamId,
      awayTeamName: teamNames[m.awayTeamId] ?? 'Unknown',
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      status: m.status,
      scheduledDate: m.scheduledDate,
      time: m.time,
    };
  });
}

export async function getUpcomingFixtures(leagueId: string, limit = 10): Promise<MatchSummary[]> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  const teamsSnap = await db.collection('teams').get();
  const teamNames: Record<string, string> = {};
  teamsSnap.forEach((doc) => {
    teamNames[doc.id] = doc.data().name ?? 'Unknown';
  });

  const snap = await db.collection('matches')
    .where('status', '==', 'upcoming')
    .orderBy('matchDay', 'asc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const m = doc.data();
    return {
      id: doc.id,
      matchDay: m.matchDay,
      homeTeamId: m.homeTeamId,
      homeTeamName: teamNames[m.homeTeamId] ?? 'Unknown',
      awayTeamId: m.awayTeamId,
      awayTeamName: teamNames[m.awayTeamId] ?? 'Unknown',
      homeScore: null,
      awayScore: null,
      status: m.status,
      scheduledDate: m.scheduledDate,
      time: m.time,
    };
  });
}

export async function getTopScorers(leagueId: string, limit = 10): Promise<TopScorerEntry[]> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  const [playersSnap, teamsSnap, goalsSnap] = await Promise.all([
    db.collection('players').get(),
    db.collection('teams').get(),
    db.collection('goals').get(),
  ]);

  const teamNames: Record<string, string> = {};
  teamsSnap.forEach((doc) => {
    teamNames[doc.id] = doc.data().name ?? 'Unknown';
  });

  const playerData: Record<string, { name: string; teamId: string }> = {};
  playersSnap.forEach((doc) => {
    const p = doc.data();
    playerData[doc.id] = {
      name: p.name ?? 'Unknown',
      teamId: p.team_id ?? p.teamId ?? '',
    };
  });

  const goalCounts: Record<string, number> = {};
  goalsSnap.forEach((doc) => {
    const g = doc.data();
    const pid = g.playerId;
    if (pid) {
      goalCounts[pid] = (goalCounts[pid] ?? 0) + 1;
    }
  });

  return Object.entries(goalCounts)
    .map(([playerId, goals]) => {
      const pd = playerData[playerId];
      return {
        playerId,
        playerName: pd?.name ?? 'Unknown',
        teamId: pd?.teamId ?? '',
        teamName: pd?.teamId ? (teamNames[pd.teamId] ?? 'Unknown') : 'Unknown',
        goals,
      };
    })
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}

export async function getTeamRoster(leagueId: string, teamId: string): Promise<PlayerInfo[]> {
  const db = getAdminDb();
  await validateLeague(db, leagueId);

  // Validate team exists
  const teamSnap = await db.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new Error(`Team with id "${teamId}" not found.`);
  }

  const playersSnap = await db.collection('players')
    .where('team_id', '==', teamId)
    .get();

  if (playersSnap.empty) {
    // Also check teamId field (snake_case vs camelCase)
    const altSnap = await db.collection('players')
      .where('teamId', '==', teamId)
      .get();
    if (!altSnap.empty) {
      return altSnap.docs.map((doc) => {
        const p = doc.data();
        return {
          id: doc.id,
          name: p.name ?? 'Unknown',
          position: p.position ?? '',
          number: p.number ?? 0,
          isManager: p.is_manager ?? p.isManager ?? false,
          photo: p.photo ?? null,
        };
      });
    }
  }

  return playersSnap.docs.map((doc) => {
    const p = doc.data();
    return {
      id: doc.id,
      name: p.name ?? 'Unknown',
      position: p.position ?? '',
      number: p.number ?? 0,
      isManager: p.is_manager ?? p.isManager ?? false,
      photo: p.photo ?? null,
    };
  });
}