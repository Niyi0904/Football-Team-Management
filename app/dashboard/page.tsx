'use client';

import { motion } from "framer-motion";
import { 
  Shield, Users, Target, AlertTriangle, 
  Trophy, TrendingUp, Star, Activity,
  Calendar, Award
} from "lucide-react";
import { useAppContext } from "../context/AppDataContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "primary" | "accent" | "destructive" | "warning";
  delay?: number;
  description?: string;
}

function StatCard({ label, value, icon: Icon, accent = "primary", delay = 0, description }: StatCardProps) {
  const accentStyles = {
    primary: "text-primary border-primary/20 bg-primary/5",
    accent: "text-accent border-accent/20 bg-accent/5",
    destructive: "text-destructive border-destructive/20 bg-destructive/5",
    warning: "text-yellow-500 border-yellow-500/20 bg-yellow-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`glass-card rounded-xl p-5 border ${accentStyles[accent]} relative overflow-hidden group`}
    >
      <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
        <Icon size={80} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-background shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
      </div>
      <p className="font-display text-3xl font-black tracking-tighter">{value}</p>
      {description && <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>}
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
  const { teams, players, goals, assists, yellowCards, redCards, getTopScorers, matches } = useAppContext();

  const playedMatches = matches.filter(m => m.status === 'played');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  
  // Advanced Stat Calculations
  const topScorers = getTopScorers();
  const totalGoals = goals.length
  const totalAssists = assists.length

  const recentActivity = [
    ...goals.map(g => ({ ...g, type: 'goal' })),
    ...yellowCards.map(y => ({ ...y, type: 'yellow' })),
    ...redCards.map(r => ({ ...r, type: 'red' })),
    ...assists.map(a => ({ ...a, type: 'assist' }))
  ]
  .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
  .slice(0, 5); // Take the 5 most recent events
  
  // Calculate average goals per match
  const avgGoals = playedMatches.length > 0 ? (totalGoals / playedMatches.length).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }} 
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter">Season Dashboard</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Live statistics for the 2026/27 League
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold bg-secondary/50 px-4 py-2 rounded-full border">
            {playedMatches.length} Matches Played
          </div>

          <div className="text-sm font-bold bg-secondary/50 px-4 py-2 rounded-full border">
            {upcomingMatches.length} Upcoming Matches
          </div>
        </div>
      </motion.div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Teams" value={teams.length} icon={Shield} accent="primary" delay={0} description="Registered Clubs" />
        <StatCard label="Active Players" value={players.length} icon={Users} accent="accent" delay={0.1} description="Verified Squads" />
        <StatCard label="Goals Scored" value={totalGoals} icon={Target} accent="primary" delay={0.2} description={`${avgGoals} goals per game`} />
        <StatCard label="Yellow Cards" value={yellowCards.length} icon={AlertTriangle} accent="warning" delay={0.3} description="Total yellow cards issued" />
        <StatCard label="Red Cards" value={redCards.length} icon={AlertTriangle} accent="destructive" delay={0.4} description="Total red cards issued" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Scorers Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6 border-none shadow-xl lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="font-display text-xl font-black uppercase tracking-tight">Golden Boot Race</h2>
            </div>
            <Link href="/stats" className="text-xs font-bold text-primary hover:underline">View All</Link>
          </div>
          <div className="grid md:grid-cols-1 gap-2">
            {topScorers.slice(0, 5).map((entry, i) => {
              const team = teams.find((t) => t.id === entry.player.teamId);
              return (
                <Link 
                  href={`/players/${entry.player.id}`}
                  key={entry.player.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-all border border-transparent hover:border-primary/20 group"
                >
                  <div className="relative">
                    <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10 shadow-lg ${
                      i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-slate-300 text-black" : "bg-orange-400 text-black"
                    }`}>
                      {i + 1}
                    </span>
                    <Avatar className="w-12 h-12 rounded-lg border-2 border-background shadow-md">
                      <AvatarImage src={entry.player.photo || ''} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-bold">{entry.player.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{entry.player.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{team?.name || "Independent"}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="font-display text-xl font-black text-primary">{entry.stats.goals}</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Goals</p>
                    </div>
                    <div className="text-center w-10">
                      <p className="font-display text-sm font-bold text-muted-foreground">{entry.stats.assists}</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Ast</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Performance/Activity Feed */}
        <div className="space-y-6">
          <motion.div className="glass-card rounded-2xl p-6 border-none shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-black uppercase tracking-tight">Live Feed</h2>
            </div>
            <div className="space-y-4">
              {recentActivity.map((event: any) => {
                const player = players.find(p => p.id === event.playerId);
                const team = teams.find(t => t.id === event.teamId);
                
                return (
                  <div key={event.id} className="relative pl-4 border-l-2 border-primary/20 py-1">
                    <div className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${
                      event.type === 'goal' ? 'bg-primary' : 
                      event.type === 'yellow' ? 'bg-yellow-500' : 
                      event.type === 'red' ? 'bg-red-600' : 'bg-accent'
                    }`} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm leading-none">{player?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">
                          {team?.name}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        event.type === 'goal' ? 'bg-primary/10 text-primary' : 
                        event.type === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' : 
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                );
              })}
              {recentActivity.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground">Waiting for kickoff...</p>
              )}
            </div>
          </motion.div>

          {/* Playtime Card */}
          <motion.div className="bg-primary p-6 rounded-2xl text-primary-foreground relative overflow-hidden">
             {/* ... Total minutes calculation ... */}
             <Award className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20" />
             <p className="text-3xl font-black mt-2">
               {playedMatches.reduce((s, m) => s + (Number(m.minutesPlayed) || 0), 0)} <span className="text-sm font-bold opacity-80">MINS</span>
             </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}