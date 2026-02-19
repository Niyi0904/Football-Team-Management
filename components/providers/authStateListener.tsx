'use client'

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useDispatch } from 'react-redux'
import { setAuth, clearAuth } from '@/lib/redux/slices/authSlice'

export default function AuthStateListener() {
  const dispatch = useDispatch()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, fetch their SaaS profile
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          dispatch(setAuth({
            uid: user.uid,
            email: user.email,
            displayName: userData.displayName,
            leagueId: userData.leagueId,
            photoUrl: userData.photoUrl
          }))
        }

      } else {
        // User logged out
        dispatch(clearAuth())
      }
    })

    return () => unsubscribe()
  }, [dispatch])

  return null // This component renders nothing
}