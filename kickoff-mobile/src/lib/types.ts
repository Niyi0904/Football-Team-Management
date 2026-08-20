// User & Auth Types
export type RoleType = 'league_manager' | 'team_manager' | 'player' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photo?: string;
  createdAt: number;
}

export interface UserRoleDoc {
  uid: string;
  role: RoleType;
  teamId?: string;
  playerId?: string;
  leagueId?: string;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  founded: string;
  stadium: string;
}

// Player Types
export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  teamId: string;
  isManager: boolean;
  photo?: string;
  linkedUserId?: string;
  createdAt: number;
}

// Match Types
export type MatchStatus = 'upcoming' | 'live' | 'played' | 'cancelled';

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
  status: MatchStatus;
  scheduledDate?: string; // ISO date
  time?: string; // HH:MM
  createdAt: number;
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

// Event Types
export interface Goal {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: number;
  minute: number;
}

export interface Assist {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: number;
}

export interface YellowCard {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: number;
  minute: number;
}

export interface RedCard {
  id: string;
  playerId: string;
  matchId: string;
  matchDay: number;
  teamId: string;
  timestamp: number;
  minute: number;
}

// Stats Types
export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

// League Settings
export interface LeagueSettings {
  seasonName: string;
  inviteDeadline: number;
  leagueVenue: string;
  matchDay: string;
  defaultTime: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  yellowsPerBan: number;
}

// Link Request Types
export type LinkRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LinkRequest {
  id: string;
  playerId: string;
  userId: string;
  userEmail?: string;
  playerName?: string;
  status: LinkRequestStatus;
  createdAt: number;
}

// Suspension Types
export interface Suspension {
  id: string;
  playerId: string;
  playerName?: string;
  reason: string;
  matchId?: string;
  startDate: number;
  endDate: number;
  active: boolean;
  createdAt: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
