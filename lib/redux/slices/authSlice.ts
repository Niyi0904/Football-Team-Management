import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  leagueId: string | null;
  photoUrl: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  uid: null,
  email: null,
  displayName: null,
  leagueId: null,
  photoUrl: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<Omit<AuthState, 'isAuthenticated'>>) => {
      return { ...action.payload, isAuthenticated: true };
    },
    clearAuth: () => initialState,
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;