'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus } from "lucide-react";
import { useAppContext } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function MatchRecordsPage() {
  return (
    <ProtectedRoute>
      <MatchRecordsContent />
    </ProtectedRoute>
  );
}

function MatchRecordsContent() {
  const { teams, players, records, addRecord, updateRecord, isAdmin } = useAppContext();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    playerId: "", matchDate: "", opponent: "",
    goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90,
  });

  const handleSubmit = () => {
    if (!form.playerId || !form.matchDate) return;
    addRecord(form);
    setForm({ playerId: "", matchDate: "", opponent: "", goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90 });
    setOpen(false);
  };

  const handleUpdate = (id: string, field: string, value: number) => {
    updateRecord(id, { [field]: Math.max(0, value) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Match Records</h1>
          <p className="text-muted-foreground mt-1">FA admin — manage player match statistics</p>
        </motion.div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Record</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">New Match Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <Select value={form.playerId} onValueChange={(v) => setForm({ ...form, playerId: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Player" /></SelectTrigger>
                  <SelectContent>
                    {players.map((p) => {
                      const t = teams.find((t) => t.id === p.teamId);
                      return <SelectItem key={p.id} value={p.id}>{p.name} ({t?.name})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Input type="date" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} className="bg-secondary border-border" />
                <Input placeholder="Opponent" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} className="bg-secondary border-border" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Goals</label>
                    <Input type="number" min={0} value={form.goals} onChange={(e) => setForm({ ...form, goals: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Assists</label>
                    <Input type="number" min={0} value={form.assists} onChange={(e) => setForm({ ...form, assists: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Yellow Cards</label>
                    <Input type="number" min={0} value={form.yellowCards} onChange={(e) => setForm({ ...form, yellowCards: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Red Cards</label>
                    <Input type="number" min={0} value={form.redCards} onChange={(e) => setForm({ ...form, redCards: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Minutes Played</label>
                  <Input type="number" min={0} max={120} value={form.minutesPlayed} onChange={(e) => setForm({ ...form, minutesPlayed: parseInt(e.target.value) || 0 })} className="bg-secondary border-border" />
                </div>
                <Button onClick={handleSubmit} className="w-full">Save Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Player</TableHead>
                <TableHead className="text-muted-foreground">Team</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Opponent</TableHead>
                <TableHead className="text-muted-foreground text-center">⚽</TableHead>
                <TableHead className="text-muted-foreground text-center">🅰️</TableHead>
                <TableHead className="text-muted-foreground text-center">🟨</TableHead>
                <TableHead className="text-muted-foreground text-center">🟥</TableHead>
                <TableHead className="text-muted-foreground text-center">Min</TableHead>
                {isAdmin && <TableHead className="text-muted-foreground text-center">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const player = players.find((p) => p.id === record.playerId);
                const team = teams.find((t) => t.id === player?.teamId);
                const isEditing = editId === record.id;
                return (
                  <TableRow key={record.id} className="border-border">
                    <TableCell className="font-medium">{player?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{team?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{record.matchDate}</TableCell>
                    <TableCell className="text-muted-foreground">{record.opponent}</TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input type="number" min={0} value={record.goals} onChange={(e) => handleUpdate(record.id, "goals", parseInt(e.target.value) || 0)} className="w-14 h-8 text-center bg-secondary border-border mx-auto" />
                      ) : (
                        <span className="text-primary font-semibold">{record.goals}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input type="number" min={0} value={record.assists} onChange={(e) => handleUpdate(record.id, "assists", parseInt(e.target.value) || 0)} className="w-14 h-8 text-center bg-secondary border-border mx-auto" />
                      ) : (
                        <span className="text-accent font-semibold">{record.assists}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input type="number" min={0} value={record.yellowCards} onChange={(e) => handleUpdate(record.id, "yellowCards", parseInt(e.target.value) || 0)} className="w-14 h-8 text-center bg-secondary border-border mx-auto" />
                      ) : (
                        <span className="text-yellow-card font-semibold">{record.yellowCards}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input type="number" min={0} value={record.redCards} onChange={(e) => handleUpdate(record.id, "redCards", parseInt(e.target.value) || 0)} className="w-14 h-8 text-center bg-secondary border-border mx-auto" />
                      ) : (
                        <span className="text-red-card font-semibold">{record.redCards}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {record.minutesPlayed}'
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditId(isEditing ? null : record.id)}
                          className="text-xs"
                        >
                          {isEditing ? "Done" : "Edit"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}