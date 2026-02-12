'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Target, AlertTriangle, Edit2 } from "lucide-react";
import { uploadProfileImage } from "@/lib/uploadImage";
import { useAppContext } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Player } from "../hooks/useAppData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
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

export default function Players() {
  return (
    <ProtectedRoute>
      <PlayersContent />
    </ProtectedRoute>
  );
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const positions = [
  "⁠Goal Keeper (GK)", 
  "Defender (DF)", 
  "Midfielder (MF)", 
  "Forward (FW)",
  "⁠⁠Central Defenders (CB)",
  "⁠⁠Right Back (RB)",
  "Left Back (LB)",
  "⁠⁠Left Wing (LW)",
  "⁠Right Wing (RW)",
  "⁠Striker (ST)",
  "⁠Defensive Midfielder (DM)",
  "⁠Attacking Midfielder (AM)",
  "Central Midfielder (CM)"
]

function PlayersContent() {
  const { teams, players, addPlayer, updatePlayer, deletePlayer, getPlayerStats, isAdmin } = useAppContext();
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [form, setForm] = useState({ name: "", position: "Forward", number: 0, teamId: "", photoFile: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = filterTeam === "all" ? players : players.filter((p) => p.teamId === filterTeam);

  const handleUpdate = async () => {
    if (!editingPlayer || !editingPlayer.name.trim()) return;
    setIsSubmitting(true);
    
    await updatePlayer(editingPlayer.id, {
      name: editingPlayer.name,
      position: editingPlayer.position,
      number: editingPlayer.number,
      teamId: editingPlayer.teamId,
    });

    setEditingPlayer(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.teamId) return;
    setIsSubmitting(true);
    let photoUrl: string | null = null;
    if (form.photoFile) {
      try {
        const uploadRes = await uploadProfileImage(form.photoFile);
        photoUrl = uploadRes?.data?.url ?? null;
      } catch (err) {
        console.error("player photo upload failed", err);
      }
    }

    await addPlayer({
      name: form.name,
      position: form.position,
      number: form.number,
      teamId: form.teamId,
      isManager: false,
      photo: photoUrl ?? null,
    });

    setForm({ name: "", position: "Forward", number: 0, teamId: "", photoFile: null });
    setOpen(false);
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Players</h1>
          <p className="text-muted-foreground mt-1">Registered players across all teams</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Register Player</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input placeholder="Player Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
                  <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Jersey Number" value={form.number || ""} onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                  <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Player Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm({ ...form, photoFile: e.target.files?.[0] ?? null })}
                      className="w-full text-sm"
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Registering..." : "Register Player"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((player, i) => {
          const team = teams.find((t) => t.id === player.teamId);
          const stats = getPlayerStats(player.id);
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => router.push(`/players/${player.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-secondary">
                      <AvatarImage src={player.photo || ""} alt={player.name} className="object-cover" />
                      <AvatarFallback 
                        style={{ backgroundColor: team?.primaryColor || 'var(--secondary)' }}
                        className="font-display text-lg font-bold text-white"
                      >
                        {getInitials(player.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* The Number Badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background">
                      {player.number}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{player.name}</h3>
                    <p className="text-xs text-muted-foreground">{player.position} · {team?.name}</p>
                  </div>
                </div>
                {player.isManager && (
                  <span className="text-[10px] uppercase tracking-wider bg-accent/15 text-accent px-2 py-1 rounded-full font-semibold">
                    Manager
                  </span>
                )}
                {isAdmin && (
                  <>
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer(player);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    {/* Delete Confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()} // Stop card click
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete **{player.name}** and remove them from their team. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              await deletePlayer(player.id);
                            }}
                          >
                            Delete Player
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <p className="font-display text-lg font-bold text-primary">{stats.goals}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Goals</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <p className="font-display text-lg font-bold text-accent">{stats.assists}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Assists</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <p className="font-display text-lg font-bold text-yellow-card">{stats.yellowCards}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">YC</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <p className="font-display text-lg font-bold text-red-card">{stats.redCards}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">RC</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Player Details</DialogTitle>
          </DialogHeader>
          {editingPlayer && (
            <div className="space-y-4 mt-4">
              <Input 
                placeholder="Player Name" 
                value={editingPlayer.name} 
                onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })} 
              />
              <Select 
                value={editingPlayer.position} 
                onValueChange={(v) => setEditingPlayer({ ...editingPlayer, position: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Goalkeeper", "Defender", "Midfielder", "Forward"].map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                type="number" 
                value={editingPlayer.number} 
                onChange={(e) => setEditingPlayer({ ...editingPlayer, number: parseInt(e.target.value) || 0 })} 
              />
              <Select 
                value={editingPlayer.teamId} 
                onValueChange={(v) => setEditingPlayer({ ...editingPlayer, teamId: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleUpdate} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}