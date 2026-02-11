import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Generate a random invite code
 */
export function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Create an invite for a new user
 */
export async function createUserInvite(
  email: string,
  role: 'admin' | 'user',
  createdByAdminId: string
): Promise<{ inviteCode: string; error: null } | { error: any }> {
  try {
    const inviteCode = generateInviteCode();
    await setDoc(doc(db, 'user_invites', inviteCode), {
      email,
      role,
      createdByAdminId,
      createdAt: serverTimestamp(),
      used: false,
      usedBy: null,
      usedAt: null,
    });
    return { inviteCode, error: null };
  } catch (error) {
    console.error('Error creating invite', error);
    return { error };
  }
}

/**
 * Get an invite by code (verify it exists and not used)
 */
export async function getInvite(inviteCode: string): Promise<any | null> {
  try {
    const inviteDoc = await getDoc(doc(db, 'user_invites', inviteCode));
    if (inviteDoc.exists() && !inviteDoc.data().used) {
      return inviteDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting invite', error);
    return null;
  }
}

/**
 * Mark invite as used
 */
export async function markInviteAsUsed(inviteCode: string, userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'user_invites', inviteCode), {
      used: true,
      usedBy: userId,
      usedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking invite as used', error);
    throw error;
  }
}

/**
 * Get all pending invites (not used yet)
 */
export async function getPendingInvites(): Promise<any[]> {
  try {
    const q = query(collection(db, 'user_invites'), where('used', '==', false));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting pending invites', error);
    return [];
  }
}

/**
 * Set user role (admin or user)
 */
export async function setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  try {
    await setDoc(doc(db, 'user_roles', userId), {
      role,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error setting user role', error);
    throw error;
  }
}

/**
 * Get all users with their roles (for admin management)
 */
export async function getAllUsersWithRoles(): Promise<any[]> {
  try {
    const userRolesSnap = await getDocs(collection(db, 'user_roles'));
    const usersSnap = await getDocs(collection(db, 'users'));

    // Combine user info with roles
    return usersSnap.docs.map((userDoc) => {
      const userData = userDoc.data();
      const roleData = userRolesSnap.docs.find((d) => d.id === userDoc.id)?.data();
      return {
        userId: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: roleData?.role ?? 'user',
      };
    });
  } catch (error) {
    console.error('Error getting users with roles', error);
    return [];
  }
}
