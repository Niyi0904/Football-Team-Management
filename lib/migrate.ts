import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const backfillLeagueData = async (targetLeagueId: string) => {
  const collectionsToUpdate = ["matches", "teams", "players", "user_roles", "users", "user_invites"];
  
  for (const collName of collectionsToUpdate) {
    console.log(`Starting migration for: ${collName}`);
    
    const querySnapshot = await getDocs(collection(db, collName));
    const batch = writeBatch(db);
    let count = 0;

    querySnapshot.forEach((document) => {
      const data = document.data();
      
      // Only update if it doesn't already have a leagueId
      if (!data.leagueId) {
        const docRef = doc(db, collName, document.id);
        batch.update(docRef, { leagueId: targetLeagueId });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully linked ${count} ${collName} to league: ${targetLeagueId}`);
    } else {
      console.log(`No orphaned ${collName} found.`);
    }
  }
};