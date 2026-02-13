'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Users, Crown, Trash2, Upload } from "lucide-react";
import { uploadProfileImage } from "@/lib/uploadImage";
import { useAppContext } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Edit2 } from "lucide-react";
import { Team } from "../hooks/useAppData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogoUploadDialog } from "@/components/TeamLogoUploadDialog";
import { useRouter } from "next/navigation";

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <TeamsContent />
    </ProtectedRoute>
  );
}

const getTeamInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function TeamsContent() {
  const { teams, addTeam, deleteTeam, updateTeam, getTeamPlayers, getTeamManager, setManager, isAdmin } = useAppContext();
  const router = useRouter(); // Added for navigation
  
  const [open, setOpen] = useState(false);
  const [managerDialog, setManagerDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", stadium: "", founded: "", primaryColor: "#3b82f6", logoFile: null as File | null });
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [selectedTeamForLogo, setSelectedTeamForLogo] = useState<Team | null>(null);

  const handleUpdateTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) return;
    setIsSubmitting(true);
    await updateTeam(editingTeam.id, editingTeam);
    setEditingTeam(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      let logoUrl: string | null = null;
      if (form.logoFile) {
        try {
          const uploadRes = await uploadProfileImage(form.logoFile);
          logoUrl = uploadRes?.data?.url ?? null;
        } catch (err) {
          console.error("logo upload failed", err);
        }
      }

      await addTeam({
        name: form.name,
        stadium: form.stadium,
        founded: form.founded,
        primaryColor: form.primaryColor,
        logo: logoUrl ?? null,
      });

      setForm({ name: "", stadium: "", founded: "", primaryColor: "#3b82f6", logoFile: null });
      setOpen(false);
    } catch (err) {
      console.error("addTeam flow error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage registered teams</p>
        </motion.div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Register Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Register New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Team Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
                <Input placeholder="Stadium" value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })} className="bg-secondary border-border" />
                <Input placeholder="Year Founded" value={form.founded} onChange={(e) => setForm({ ...form, founded: e.target.value })} className="bg-secondary border-border" />
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">Team Color</label>
                  <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Team Logo (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, logoFile: e.target.files?.[0] ?? null })}
                    className="w-full text-sm"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Register Team"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team, i) => {
          const teamPlayers = getTeamPlayers(team.id);
          const manager = getTeamManager(team.id);
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
              onClick={() => router.push(`/teams/${team.id}`)}
            >
              <div className="h-2" style={{ backgroundColor: team.primaryColor }} />
              
              {/* Action Buttons - e.stopPropagation() prevents navigation when clicking buttons */}
              <div className="absolute top-4 right-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary bg-background/50 backdrop-blur-sm"
                      onClick={() => setEditingTeam(team)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive bg-background/50 backdrop-blur-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {teamPlayers.length > 0 ? "Cannot Delete Team" : "Are you absolutely sure?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {teamPlayers.length > 0 ? (
                              <>
                                The team <strong>{team.name}</strong> currently has <strong>{teamPlayers.length}</strong> players. 
                                You must remove or reassign all players before this team can be deleted.
                              </>
                            ) : (
                              <>
                                This will permanently delete <strong>{team.name}</strong> and all associated data.
                              </>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Close</AlertDialogCancel>
                          {teamPlayers.length === 0 && (
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => await deleteTeam(team.id)}
                            >
                              Delete Team
                            </AlertDialogAction>
                          )}
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="relative" 
                    onClick={(e) => {
                      if (isAdmin) {
                        e.stopPropagation();
                        setSelectedTeamForLogo(team);
                        setLogoDialogOpen(true);
                      }
                    }}
                  >
                    <Avatar className="w-12 h-12 rounded-xl border-2 border-secondary shadow-sm">
                      <AvatarImage src={team.logo || ""} alt={team.name} className="object-cover" />
                      <AvatarFallback style={{ backgroundColor: team.primaryColor }} className="rounded-xl font-bold text-white">
                        {getTeamInitials(team.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isAdmin && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-background">
                        <Upload className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">{team.stadium} · Est. {team.founded}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{teamPlayers.length} players</span>
                  </div>
                  {manager && (
                    <div className="flex items-center gap-1 text-accent">
                      <Crown className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{manager.name}</span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <Dialog open={managerDialog === team.id} onOpenChange={(v) => setManagerDialog(v ? team.id : null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Crown className="w-3.5 h-3.5" /> Assign Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border" onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle className="font-display text-xl">Assign Manager — {team.name}</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <Select onValueChange={(val) => { setManager(team.id, val); setManagerDialog(null); }}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Select a player" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamPlayers.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} — #{p.number} {p.position}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Team — {editingTeam?.name}</DialogTitle>
          </DialogHeader>
          {editingTeam && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Team Name</label>
                <Input value={editingTeam.name} onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Stadium</label>
                <Input value={editingTeam.stadium} onChange={(e) => setEditingTeam({...editingTeam, stadium: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Year Founded</label>
                <Input value={editingTeam.founded} onChange={(e) => setEditingTeam({...editingTeam, founded: e.target.value})} className="bg-secondary border-border" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Team Color</label>
                <input type="color" value={editingTeam.primaryColor} onChange={(e) => setEditingTeam({...editingTeam, primaryColor: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0" />
              </div>
              <Button onClick={handleUpdateTeam} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TeamLogoUploadDialog 
        team={selectedTeamForLogo} 
        open={logoDialogOpen} 
        onOpenChange={setLogoDialogOpen} 
      />
    </div>
  );
}