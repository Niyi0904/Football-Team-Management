'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Target, AlertTriangle } from "lucide-react";
import { uploadProfileImage } from "@/lib/uploadImage";
import { useAppContext } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Players() {
  return (
    <ProtectedRoute>
      <PlayersContent />
    </ProtectedRoute>
  );
}

function PlayersContent() {
  const { teams, players, addPlayer, getPlayerStats, isAdmin } = useAppContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [form, setForm] = useState({ name: "", position: "Forward", number: 0, teamId: "", photoFile: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = filterTeam === "all" ? players : players.filter((p) => p.teamId === filterTeam);

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
                      {["Goalkeeper", "Defender", "Midfielder", "Forward"].map((pos) => (
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
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center font-display text-lg font-bold text-primary">
                    {player.number}
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
    </div>
  );
}