import { doc, updateDoc } from 'firebase/firestore';
import { User, updateProfile } from 'firebase/auth';
import { db } from './firebase';
import { uploadProfileImage } from './uploadImage';

export async function updateUserProfilePicture(
  userId: string,
  file: File,
  user?: User | null
): Promise<string> {
  try {
    // Upload image to imgBB
    const uploadRes = await uploadProfileImage(file);
    
    if (!uploadRes?.data?.url) {
      throw new Error('Failed to upload image');
    }

    const photoUrl = uploadRes.data.url;

    // Update Firestore
    await updateDoc(doc(db, 'users', userId), {
      photoUrl: photoUrl,
    });

    // Update Firebase Auth profile if user is provided
    if (user) {
      await updateProfile(user, {
        photoURL: photoUrl,
      });
    }

    return photoUrl;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw error;
  }
}

export function getInitials(displayName: string | null | undefined): string {
  if (!displayName) return '??';
  const names = displayName.trim().split(' ');
  const initials = names
    .slice(0, 2)
    .map(name => name.charAt(0).toUpperCase())
    .join('');
  return initials || '??';
}
