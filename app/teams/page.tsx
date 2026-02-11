'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Users, Crown } from "lucide-react";
import { uploadProfileImage } from "@/lib/uploadImage";
import { useAppContext } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <TeamsContent />
    </ProtectedRoute>
  );
}

function TeamsContent() {
  const { teams, addTeam, getTeamPlayers, getTeamManager, players, setManager, isAdmin } = useAppContext();
  const [open, setOpen] = useState(false);
  const [managerDialog, setManagerDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", stadium: "", founded: "", primaryColor: "#3b82f6", logoFile: null as File | null });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          // proceed without logo
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
              className="glass-card rounded-xl overflow-hidden"
            >
              <div className="h-2" style={{ backgroundColor: team.primaryColor }} />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: team.primaryColor + "20" }}>
                    <Shield className="w-6 h-6" style={{ color: team.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">{team.name}</h3>
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
                      <span className="truncate">{manager.name}</span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <Dialog open={managerDialog === team.id} onOpenChange={(v) => setManagerDialog(v ? team.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Crown className="w-3.5 h-3.5" /> Assign Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
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
    </div>
  );
}