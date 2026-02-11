'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon } from 'lucide-react';
import { useAppContext } from '@/app/context/AppDataContext';
import { getAllUsersWithRoles, setUserRole } from '@/lib/admin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/app/hooks/use-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  );
}

function UsersContent() {
  const { isAdmin } = useAppContext();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const usersData = await getAllUsersWithRoles();
      setUsers(usersData);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only admins can access this section.</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Manage user roles and permissions</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <UsersIcon className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl font-bold">All Users</h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.userId} className="hover:bg-secondary/50 transition-colors">
                    <td className="py-4 font-medium text-foreground">{user.displayName}</td>
                    <td className="py-4 text-muted-foreground">{user.email}</td>
                    <td className="py-4">
                      <span className="text-xs uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 text-muted-foreground text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4">
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => handleChangeRole(user.userId, newRole as 'admin' | 'user')}
                        disabled={changingRoleUserId === user.userId}
                      >
                        <SelectTrigger className="w-20 bg-secondary border-border text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
