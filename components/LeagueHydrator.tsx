// components/LeagueHydrator.tsx
'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';
import { LeagueState, setLeague } from '@/lib/redux/slices/leagueSlice'; // Adjust path
import { getLeagueBySlug } from '@/lib/admin';

export function LeagueHydrator() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const leagueId = useSelector((state: RootState) => state.league.id);

  useEffect(() => {
    const hydrate = async () => {
      // If we have a slug in the URL but nothing in Redux, fetch it!
      if (slug && !leagueId) {
        console.log("Hydrating league state for slug:", slug);
        const leagueData = await getLeagueBySlug(slug as string);
        if (leagueData) {
          dispatch(setLeague(leagueData as LeagueState));
        } else {
          console.error("League not found for slug:", slug);
        }
      }
    };
    hydrate();
  }, [slug, leagueId, dispatch]);

  return null; // This component renders nothing, it just manages state
}