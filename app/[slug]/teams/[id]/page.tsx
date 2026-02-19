'use client';

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Shield, Users, Trophy, 
  Calendar, Target, Star, TrendingUp, 
  Crown
} from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { teams, getTeamPlayers, getTeamManager, matches, goals, assists } = useAppContext();

  const team = teams.find((t) => t.id === id);
  if (!team) return <div className="p-20 text-center">Team not found</div>;

  const teamPlayers = getTeamPlayers(team.id);
  const manager = getTeamManager(team.id);

  // 1. Calculate Team Stats
  const teamMatches = matches.filter(m => m.homeTeamId === id || m.awayTeamId === id);
  const totalGoals = goals.filter(g => teamPlayers.some(p => p.id === g.playerId)).length;
  const totalAssists = assists.filter(a => teamPlayers.some(p => p.id === a.playerId)).length;

  // 2. Real Form Logic (Calculates W/D/L from actual match scores)
  const getMatchResult = (match: any) => {
    const isHome = match.homeTeamId === id;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;
    if (teamScore > oppScore) return { label: 'W', color: 'bg-green-500' };
    if (teamScore < oppScore) return { label: 'L', color: 'bg-destructive' };
    return { label: 'D', color: 'bg-yellow-500' };
  };

  // 3. Find Top Scorer & Top Playmaker (Assists)
  const playerStats = teamPlayers.map(p => ({
    ...p,
    goals: goals.filter(g => g.playerId === p.id).length,
    assists: assists.filter(a => a.playerId === p.id).length
  }));

  const topScorer = [...playerStats].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...playerStats].sort((a, b) => b.assists - a.assists)[0];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center gap-6 py-8 border-b mb-8"
      >
        <Button variant="outline" size="icon" onClick={() => router.push("/teams")} className="rounded-full shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-24 h-24 rounded-2xl border-4 border-card shadow-xl">
          <AvatarImage src={team.logo || ""} className="object-cover" />
          <AvatarFallback style={{ backgroundColor: team.primaryColor }} className="text-3xl font-bold text-white">
            {team.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-4xl font-black uppercase tracking-tighter">{team.name}</h1>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.primaryColor }} />
          </div>
          <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
            <Shield className="w-4 h-4" /> {team.stadium} • <Calendar className="w-4 h-4" /> Est. {team.founded}
          </p>
        </div>

        <div className="flex gap-4">
           <div className="text-center bg-card p-4 rounded-xl border border-border/50 min-w-[100px]">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Matches</p>
              <p className="text-2xl font-black">{teamMatches.length}</p>
           </div>
           <div className="text-center bg-card p-4 rounded-xl border border-border/50 min-w-[100px]">
              <p className="text-[10px] uppercase font-black text-primary">Goals</p>
              <p className="text-2xl font-black text-primary">{totalGoals}</p>
           </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Squad & Staff */}
        <div className="space-y-6">
          <Card className="glass-card border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Squad List ({teamPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {teamPlayers.map(p => (
                <div key={p.id} onClick={() => router.push(`/players/${p.id}`)} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-6 group-hover:text-primary transition-colors">#{p.number}</span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <span className="text-[10px] uppercase bg-secondary px-2 py-1 rounded font-black text-muted-foreground">{p.position}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {manager && (
            <Card className="border-accent/20 bg-accent/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Star className="w-12 h-12" />
              </div>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-accent/20 p-2 rounded-lg">
                    <Crown className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-accent tracking-widest">Manager</p>
                    <p className="text-xl font-bold">{manager.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle/Right: Performance & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-card to-secondary/30 border-none shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase flex items-center gap-2"><Trophy className="w-3 h-3 text-yellow-500" /> Top Scorer</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-black truncate">{topScorer?.goals > 0 ? topScorer.name : "N/A"}</p>
                <p className="text-sm text-muted-foreground font-medium">{topScorer?.goals || 0} Goals</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-secondary/30 border-none shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase flex items-center gap-2"><Target className="w-3 h-3 text-blue-500" /> Top Assister</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-black truncate">{topAssister?.assists > 0 ? topAssister.name : "N/A"}</p>
                <p className="text-sm text-muted-foreground font-medium">{topAssister?.assists || 0} Assists</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-secondary/30 border-none shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase flex items-center gap-2"><TrendingUp className="w-3 h-3 text-green-500" /> Recent Form</CardTitle></CardHeader>
              <CardContent className="flex gap-1.5 pt-1">
                {teamMatches.slice(-5).map((m, i) => {
                  const res = getMatchResult(m);
                  return (
                    <div key={i} title={res.label} className={`w-7 h-7 rounded-md ${res.color} flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>
                      {res.label}
                    </div>
                  );
                })}
                {teamMatches.length === 0 && <span className="text-xs text-muted-foreground italic">No data</span>}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Match Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[...teamMatches].reverse().map(match => {
                  const isHome = match.homeTeamId === id;
                  const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
                  const opponent = teams.find(t => t.id === opponentId);
                  const result = getMatchResult(match);
                  
                  return (
                    <motion.div 
                      whileHover={{ x: 4 }}
                      key={match.id} 
                      className="p-5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                          {match.createdAt ? format(new Date(match.createdAt.seconds * 1000), "PPP") : "TBD"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${result.color}`} />
                          <span className="font-black text-lg">vs {opponent?.name || "Unknown"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                           <div className="text-2xl font-black font-mono tracking-tighter">
                             {match.homeScore} - {match.awayScore}
                           </div>
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isHome ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {isHome ? 'Home' : 'Away'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {teamMatches.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-6 h-6 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-muted-foreground text-sm italic">The season hasn't started for {team.name} yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}