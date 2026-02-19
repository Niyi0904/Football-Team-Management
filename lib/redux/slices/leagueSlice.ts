import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LeagueState {
  id: string | null;
  leagueName: string | null;
  slug: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  adminIds: string[];
  theme: {
    primary: string;
    secondary: string;
  };
  settings: {
    pointsForWin: number;
    maxTeams: number;
  };
  subscription: {
    active: boolean;
    plan: 'grassroots' | 'semi-pro' | 'pro' | 'elite';
  };
  createdAt: string | null; // Store as ISO string for Redux serializability
}

const initialState: LeagueState = {
  id: null,
  leagueName: null,
  slug: null,
  logoUrl: null,
  ownerId: null,
  adminIds: [],
  theme: { primary: "#10b981", secondary: "#064e3b" },
  settings: { pointsForWin: 3, maxTeams: 3 },
  subscription: { active: false, plan: 'grassroots' },
  createdAt: null,
};

const leagueSlice = createSlice({
  name: 'league',
  initialState,
  reducers: {
    setLeague: (state, action: PayloadAction<LeagueState>) => {
      return action.payload;
    },
    clearLeague: () => initialState,
  },
});

export const { setLeague, clearLeague } = leagueSlice.actions;
export default leagueSlice.reducer;