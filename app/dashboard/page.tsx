'use client';

import { motion } from "framer-motion";
import { Shield, Users, Target, AlertTriangle, Trophy, TrendingUp } from "lucide-react";
import { useAppContext } from "../context/AppDataContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "primary" | "accent" | "destructive" | "warning";
  delay?: number;
}

function StatCard({ label, value, icon: Icon, accent = "primary", delay = 0 }: StatCardProps) {
  const accentStyles = {
    primary: "text-primary border-primary/20",
    accent: "text-accent border-accent/20",
    destructive: "text-destructive border-destructive/20",
    warning: "text-yellow-card border-yellow-card/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`glass-card stat-gradient rounded-xl p-6 border ${accentStyles[accent]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display text-4xl font-bold">{value}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { teams, players, records, getTopScorers } = useAppContext();
  const topScorers = getTopScorers();
  const totalGoals = records.reduce((s, r) => s + r.goals, 0);
  const totalCards = records.reduce((s, r) => s + r.yellowCards + r.redCards, 0);

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Season overview & statistics</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Teams" value={teams.length} icon={Shield} accent="primary" delay={0} />
        <StatCard label="Players" value={players.length} icon={Users} accent="accent" delay={0.1} />
        <StatCard label="Goals" value={totalGoals} icon={Target} accent="primary" delay={0.2} />
        <StatCard label="Cards" value={totalCards} icon={AlertTriangle} accent="warning" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Scorers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Top Scorers</h2>
          </div>
          <div className="space-y-3">
            {topScorers.slice(0, 5).map((entry, i) => {
              const team = teams.find((t) => t.id === entry.player.teamId);
              return (
                <div
                  key={entry.player.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <span className={`font-display text-lg font-bold w-6 text-center ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.player.name}</p>
                    <p className="text-xs text-muted-foreground">{team?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-primary">{entry.stats.goals}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">goals</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Recent Records</h2>
          </div>
          <div className="space-y-3">
            {records.slice(-5).reverse().map((record) => {
              const player = players.find((p) => p.id === record.playerId);
              return (
                <div key={record.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{player?.name}</p>
                    <p className="text-xs text-muted-foreground">vs {record.opponent} · {record.matchDate}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {record.goals > 0 && (
                      <span className="text-primary font-semibold">⚽ {record.goals}</span>
                    )}
                    {record.assists > 0 && (
                      <span className="text-accent font-semibold">🅰️ {record.assists}</span>
                    )}
                    {record.yellowCards > 0 && (
                      <span className="inline-block w-3 h-4 rounded-sm bg-yellow-card" />
                    )}
                    {record.redCards > 0 && (
                      <span className="inline-block w-3 h-4 rounded-sm bg-red-card" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
