'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Mail, Copy, Trash2, Check, X } from 'lucide-react';
import { useAppContext } from '@/app/context/AppDataContext';
import { createUserInvite, getPendingInvites, setUserRole, getAllUsersWithRoles, deleteUserInvite, findPendingInviteByEmail, isUserRegistered } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/app/hooks/use-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}

function OnboardingContent() {
  const { isAdmin, user } = useAppContext();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [emailStatus, setEmailStatus] = useState<{ pendingInvite?: any; registered?: boolean } | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string | null>(null);
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (isAdmin) {
      fetchPendingInvites();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchPendingInvites = async () => {
    const invites = await getPendingInvites();
    setPendingInvites(invites);
  };

  const fetchUsers = async () => {
    const usersData = await getAllUsersWithRoles();
    setUsers(usersData);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only admins can access the onboarding section.</p>
        </div>
      </div>
    );
  }

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: 'Error', description: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createUserInvite(inviteEmail, inviteRole, user?.uid || '');
      if (!res.error && 'inviteCode' in res) {
        // Send email if enabled
        if (sendEmail) {
          try {
            const emailRes = await fetch('/api/send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: inviteEmail,
                inviteCode: res.inviteCode,
                role: inviteRole,
              }),
            });

            if (!emailRes.ok) {
              toast({ 
                title: 'Warning', 
                description: 'Invite created but email failed to send. You can share the code manually.', 
                variant: 'destructive' 
              });
            } else {
              toast({ title: 'Success', description: 'Invite created and sent via email!' });
            }
          } catch (emailErr) {
            console.error('Email sending error:', emailErr);
            toast({ 
              title: 'Warning', 
              description: `Invite created: ${res.inviteCode}. Email failed to send, but code will be displayed below.`, 
              variant: 'destructive' 
            });
          }
        } else {
          toast({ title: 'Success', description: `Invite created: ${res.inviteCode}` });
        }
        
        setInviteEmail('');
        setInviteRole('user');
        setSendEmail(true);
        setOpenInviteDialog(false);
        await fetchPendingInvites();
      } else if (res.error) {
        const code = res.error.code;
        if (code === 'ALREADY_INVITED') {
          toast({ title: 'Invite Exists', description: 'There is already a pending invite for this email.', variant: 'destructive' });
        } else if (code === 'ALREADY_REGISTERED') {
          toast({ title: 'User Exists', description: 'A user with this email is already registered.', variant: 'destructive' });
        } else {
          const msg = typeof res.error === 'string' ? res.error : res.error?.message ?? 'Failed to create invite';
          toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: 'Failed to create invite', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Debounced live email validation
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const email = inviteEmail?.trim();
    if (!email) {
      setEmailStatus(null);
      setEmailChecking(false);
      return;
    }
    setEmailChecking(true);
    t = setTimeout(async () => {
      try {
        const pending = await findPendingInviteByEmail(email);
        const registered = await isUserRegistered(email);
        setEmailStatus({ pendingInvite: pending ?? undefined, registered: !!registered });
      } catch (err) {
        setEmailStatus(null);
      } finally {
        setEmailChecking(false);
      }
    }, 400);

    return () => {
      if (t) clearTimeout(t);
    };
  }, [inviteEmail]);

  const handleResendInvite = async (inviteCode: string, role: string) => {
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, inviteCode, role }),
      });
      if (resp.ok) {
        toast({ title: 'Sent', description: 'Invite email resent' });
      } else {
        toast({ title: 'Error', description: 'Failed to resend invite', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to resend invite', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteCode: string) => {
    if (!confirm('Revoke this invite? This cannot be undone.')) return;
    setIsSubmitting(true);
    try {
      const res = await deleteUserInvite(inviteCode);
      if ((res as any).error) {
        toast({ title: 'Error', description: 'Failed to revoke invite', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Invite revoked' });
        await fetchPendingInvites();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to revoke invite', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    setChangingRoleUserId(userId);
    try {
      await setUserRole(userId, newRole);
      toast({ title: 'Success', description: `User role updated to ${newRole}` });
      await fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setChangingRoleUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Invite new users and manage admin roles</p>
      </motion.div>

      {/* Invite New User Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Invite New User</h2>
        </div>

        <Dialog open={openInviteDialog} onOpenChange={setOpenInviteDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create User Invite</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-secondary border-border"
                />

                <div className="mt-2">
                  {emailChecking ? (
                    <p className="text-sm text-muted-foreground">Checking email…</p>
                  ) : emailStatus?.registered ? (
                    <p className="text-sm text-destructive">This email is already registered.</p>
                  ) : emailStatus?.pendingInvite ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-amber-600">Pending invite exists (code: {emailStatus.pendingInvite.id})</p>
                      <Button size="sm" variant="ghost" onClick={() => handleResendInvite(emailStatus.pendingInvite.id, emailStatus.pendingInvite.role)}>
                        <Mail className="w-4 h-4" /> Resend
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Role</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'user')}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="send-email" 
                  checked={sendEmail} 
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <label htmlFor="send-email" className="text-sm text-muted-foreground cursor-pointer">
                  Send invite via email
                </label>
              </div>
              <Button onClick={handleCreateInvite} className="w-full" disabled={isSubmitting || !!emailStatus?.registered || !!emailStatus?.pendingInvite}>
                {isSubmitting ? 'Creating...' : 'Create Invite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Pending Invites Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="font-display text-xl font-bold mb-6">Pending Invites</h2>
        <div className="space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-muted-foreground">No pending invites</p>
          ) : (
            pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-sm font-semibold">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">Code: {invite.id}</p>
                </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-accent/15 text-accent px-2 py-1 rounded-full font-medium">
                      {invite.role}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyCode(invite.id)}
                      className="gap-1"
                    >
                      {copiedCode === invite.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="gap-1 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" /> Revoke
                    </Button>
                  </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Manage Users Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="font-display text-xl font-bold mb-6">Manage Users</h2>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found</p>
          ) : (
            users.map((usr) => (
              <div key={usr.userId} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-sm font-semibold">{usr.displayName}</p>
                  <p className="text-xs text-muted-foreground">{usr.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={usr.role}
                    onValueChange={(newRole) => handleChangeRole(usr.userId, newRole as 'admin' | 'user')}
                    disabled={changingRoleUserId === usr.userId}
                  >
                    <SelectTrigger className="w-24 bg-secondary border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
