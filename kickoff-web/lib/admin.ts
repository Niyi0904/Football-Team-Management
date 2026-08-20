// lib/admin.ts
// Updated invite system with player linking support.

import {
  doc, setDoc, getDoc, updateDoc, collection,
  getDocs, query, where, deleteDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

async function getInviteDeadlineMs(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'league'));
    if (snap.exists() && snap.data().inviteDeadline) {
      return new Date(snap.data().inviteDeadline).getTime();
    }
  } catch (err) {
    console.error('Could not read invite deadline:', err);
  }
  return new Date('2099-12-31T23:59:59').getTime();
}

async function getLeagueIdForPlayerCreation(createdByAdminId: string, teamId: string): Promise<string> {
  if (createdByAdminId) {
    const roleSnap = await getDoc(doc(db, 'user_roles', createdByAdminId));
    const roleLeagueId = roleSnap.exists() ? roleSnap.data()?.leagueId : null;
    if (roleLeagueId) return roleLeagueId;
  }

  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  const teamLeagueId = teamSnap.exists() ? teamSnap.data()?.leagueId : null;
  if (teamLeagueId) return teamLeagueId;

  throw new Error('Cannot create player without a leagueId from the creating user role or selected team.');
}

export type InvitePlayerMode = 'none' | 'link_existing' | 'create_new';

export interface NewPlayerData {
  name: string; position: string; number: number; teamId: string;
}

export interface CreateInviteOptions {
  email: string;
  role: 'league_manager' | 'team_manager' | 'player';
  createdByAdminId: string;
  playerMode: InvitePlayerMode;
  playerId?: string;
  newPlayer?: NewPlayerData;
}

export async function createUserInvite(
  options: CreateInviteOptions
): Promise<{ inviteCode: string; error: null } | { error: any }> {
  const { email, role, createdByAdminId, playerMode, playerId, newPlayer } = options;

  const deadlineMs = await getInviteDeadlineMs();
  if (Date.now() > deadlineMs) {
    return { error: { code: 'INVITES_CLOSED', message: 'Registration period has ended.' } };
  }

  try {
    const existingSnap = await getDocs(
      query(collection(db, 'user_invites'), where('email', '==', email), where('used', '==', false))
    );
    if (!existingSnap.empty) {
      return { error: { code: 'ALREADY_INVITED', message: 'A pending invite already exists for this email.' } };
    }

    const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (!usersSnap.empty) {
      return { error: { code: 'ALREADY_REGISTERED', message: 'A user with this email is already registered.' } };
    }

    const batch = writeBatch(db);
    const inviteCode = generateInviteCode();
    let linkedPlayerId: string | null = null;

    if (playerMode === 'link_existing' && playerId) {
      const playerSnap = await getDoc(doc(db, 'players', playerId));
      if (playerSnap.exists() && playerSnap.data()?.linkedUserId) {
        return { error: { code: 'PLAYER_ALREADY_LINKED', message: 'This player profile is already linked to another account.' } };
      }
      linkedPlayerId = playerId;
    }

    if (playerMode === 'create_new' && newPlayer) {
      const leagueId = await getLeagueIdForPlayerCreation(createdByAdminId, newPlayer.teamId);
      const newPlayerRef = doc(collection(db, 'players'));
      batch.set(newPlayerRef, {
        name: newPlayer.name, position: newPlayer.position,
        number: newPlayer.number, team_id: newPlayer.teamId,
        leagueId,
        is_manager: false, photo: null, deletedAt: null,
      });
      linkedPlayerId = newPlayerRef.id;
    }

    batch.set(doc(db, 'user_invites', inviteCode), {
      email, role, createdByAdminId,
      createdAt: serverTimestamp(),
      used: false, usedBy: null, usedAt: null,
      playerMode, linkedPlayerId,
    });

    await batch.commit();
    return { inviteCode, error: null };
  } catch (error) {
    return { error };
  }
}

export async function completeRegistration(inviteCode: string, userId: string): Promise<void> {
  const inviteSnap = await getDoc(doc(db, 'user_invites', inviteCode));
  if (!inviteSnap.exists()) return;
  const invite = inviteSnap.data();
  const batch = writeBatch(db);

  batch.update(doc(db, 'user_invites', inviteCode), {
    used: true, usedBy: userId, usedAt: serverTimestamp(),
  });

  let teamId: string | null = null;
  if (invite.linkedPlayerId) {
    const playerSnap = await getDoc(doc(db, 'players', invite.linkedPlayerId));
    if (playerSnap.exists()) {
      const playerData = playerSnap.data();
      teamId = playerData?.team_id ?? playerData?.teamId ?? null;
    }
  }

  batch.set(doc(db, 'user_roles', userId), {
    role: invite.role ?? 'player',
    playerId: invite.linkedPlayerId ?? null,
    teamId: teamId,
    updatedAt: serverTimestamp()
  });

  if (invite.linkedPlayerId) {
    batch.update(doc(db, 'players', invite.linkedPlayerId), { linkedUserId: userId });
    const linkReqRef = doc(collection(db, 'link_requests'));
    batch.set(linkReqRef, {
      userId, playerId: invite.linkedPlayerId,
      userEmail: invite.email, userName: '', playerName: '', teamName: '',
      status: 'approved', createdAt: serverTimestamp(),
      reviewedAt: serverTimestamp(), reviewedBy: invite.createdByAdminId,
      rejectNote: null, autoLinked: true,
    });
  }

  await batch.commit();
}

export async function linkExistingUserToPlayer(
  userId: string, playerId: string, adminUid: string,
): Promise<{ error: null } | { error: any }> {
  try {
    const playerSnap = await getDoc(doc(db, 'players', playerId));
    if (!playerSnap.exists()) return { error: { message: 'Player not found.' } };
    if (playerSnap.data()?.linkedUserId) return { error: { message: 'This player is already linked to another account.' } };

    const teamId = playerSnap.data()?.team_id ?? playerSnap.data()?.teamId ?? null;

    const batch = writeBatch(db);
    batch.update(doc(db, 'players', playerId), { linkedUserId: userId });
    
    // Also update user roles with playerId and teamId
    batch.set(doc(db, 'user_roles', userId), {
      playerId: playerId,
      teamId: teamId,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const linkReqRef = doc(collection(db, 'link_requests'));
    batch.set(linkReqRef, {
      userId, playerId, status: 'approved',
      createdAt: serverTimestamp(), reviewedAt: serverTimestamp(),
      reviewedBy: adminUid, autoLinked: false, adminForced: true,
    });
    await batch.commit();
    return { error: null };
  } catch (error) { return { error }; }
}

export async function getInvite(inviteCode: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, 'user_invites', inviteCode));
    if (snap.exists() && !snap.data().used) return snap.data();
    return null;
  } catch { return null; }
}

export async function markInviteAsUsed(inviteCode: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'user_invites', inviteCode), { used: true, usedBy: userId, usedAt: serverTimestamp() });
}

export async function getPendingInvites(): Promise<any[]> {
  const snap = await getDocs(query(collection(db, 'user_invites'), where('used', '==', false)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function findPendingInviteByEmail(email: string): Promise<any | null> {
  const snap = await getDocs(query(collection(db, 'user_invites'), where('email', '==', email), where('used', '==', false)));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function isUserRegistered(email: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  return !snap.empty;
}

export async function setUserRole(userId: string, role: 'league_manager' | 'team_manager' | 'player'): Promise<void> {
  await setDoc(doc(db, 'user_roles', userId), { role, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAllUsersWithRoles(): Promise<any[]> {
  const [rolesSnap, usersSnap, linkSnap] = await Promise.all([
    getDocs(collection(db, 'user_roles')),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'link_requests'), where('status', '==', 'approved'))),
  ]);
  console.log('Fetched user roles:', rolesSnap.docs);
  console.log('Fetched users:', usersSnap.docs);
  console.log('Fetched link requests:', linkSnap.docs);
  return usersSnap.docs.map(d => {
    const userData = d.data();
    const roleData = rolesSnap.docs.find(r => r.id === d.id)?.data();
    const linkData = linkSnap.docs.find(l => l.data().userId === d.id)?.data();
    return {
      userId: d.id,
      email: userData.email,
      displayName: userData.displayName,
      role: roleData?.role ?? 'player',
      createdAt: userData.createdAt ?? null,
      linkedPlayerId: linkData?.playerId ?? null,
      linkedPlayerName: linkData?.playerName ?? null,
    };
  });
}

export async function deleteUserInvite(inviteCode: string): Promise<{ success: true } | { error: any }> {
  try { await deleteDoc(doc(db, 'user_invites', inviteCode)); return { success: true }; }
  catch (error) { return { error }; }
}

export async function runRoleMigration(): Promise<{ success: boolean; count: number; error?: any }> {
  try {
    const rolesSnap = await getDocs(collection(db, 'user_roles'));
    const playersSnap = await getDocs(collection(db, 'players'));
    const batch = writeBatch(db);
    let count = 0;

    const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const roleDoc of rolesSnap.docs) {
      const userId = roleDoc.id;
      const data = roleDoc.data();
      const currentRole = data.role;
      let newRole = currentRole;
      let playerId = data.playerId ?? null;
      let teamId = data.teamId ?? null;

      // Find if this user is linked to a player profile
      const linkedPlayer: any = players.find((p: any) => p.linkedUserId === userId);
      if (linkedPlayer) {
        playerId = linkedPlayer.id;
        teamId = linkedPlayer.team_id ?? linkedPlayer.teamId ?? null;
      }

      if (currentRole === 'admin') {
        newRole = 'league_manager';
      } else if (currentRole === 'user' || currentRole === 'player' || !currentRole) {
        if (linkedPlayer && (linkedPlayer.is_manager === true || linkedPlayer.isManager === true)) {
          newRole = 'team_manager';
        } else {
          newRole = 'player';
        }
      }

      // Update if role, teamId, or playerId changes (so we backfill all missing teamIds/playerIds)
      if (newRole !== currentRole || data.playerId !== playerId || data.teamId !== teamId) {
        batch.set(doc(db, 'user_roles', userId), {
          role: newRole,
          playerId,
          teamId,
          updatedAt: serverTimestamp()
        }, { merge: true });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    return { success: true, count };
  } catch (error) {
    console.error('Role migration error:', error);
    return { success: false, count: 0, error };
  }
}
