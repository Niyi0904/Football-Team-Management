import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'user_roles', userId));
    if (userDoc.exists()) {
      return userDoc.data()?.role || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

export async function createUserDocument(userId: string, email: string, displayName: string, photoUrl?: string): Promise<void> {
  try {
    // Create user document in users collection
    await setDoc(doc(db, 'users', userId), {
      email,
      displayName,
      photoUrl: photoUrl || null,
      createdAt: serverTimestamp(),
    });

    // Create user role entry (default to 'user')
    await setDoc(doc(db, 'user_roles', userId), {
      role: 'user',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

