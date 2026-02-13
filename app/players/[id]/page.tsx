'use client';

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Target, Users, AlertTriangle, Trophy, TrendingUp, Calendar } from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

const performanceChartConfig: ChartConfig = {
  goals: { label: "Goals", color: "hsl(var(--primary))" },
  assists: { label: "Assists", color: "hsl(var(--accent))" },
};

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { players, teams, getPlayerStats, getPlayerRecords } = useAppContext();

  const player = players.find((p) => p.id === id);
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <Users className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Player not found</h2>
        <Button variant="default" className="mt-4" onClick={() => router.push("/players")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Players
        </Button>
      </div>
    );
  }

  const team = teams.find((t) => t.id === player.teamId);
  const stats = getPlayerStats(player.id);
  const records = getPlayerRecords(player.id).sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  const matchChartData = records.map((r) => {
    let displayDate = "N/A";
    try {
      const parsedDate = parseISO(r.matchDate);
      if (!isNaN(parsedDate.getTime())) {
        displayDate = format(parsedDate, "dd MMM");
      }
    } catch (e) {
      console.error("Date parsing error:", e);
    }

    return {
      date: displayDate,
      goals: r.goals,
      assists: r.assists,
    };
  });

  const radarData = [
    { stat: "Scoring", value: Math.min(100, (stats.goals / Math.max(stats.matches, 1)) * 100) },
    { stat: "Creative", value: Math.min(100, (stats.assists / Math.max(stats.matches, 1)) * 100) },
    { stat: "Matches", value: Math.min(100, (stats.matches / 10) * 100) },
    { stat: "Discipline", value: Math.max(0, 100 - (stats.yellowCards * 25 + stats.redCards * 50)) },
    { stat: "Impact", value: Math.min(100, ((stats.goals + stats.assists) / Math.max(stats.matches, 1)) * 80) },
  ];

  const statItems = [
    { label: "Goals", value: stats.goals, icon: Target, accent: "text-primary" },
    { label: "Assists", value: stats.assists, icon: TrendingUp, accent: "text-accent" },
    { label: "Matches", value: stats.matches, icon: Trophy, accent: "text-yellow-500" },
    { label: "Yellows", value: stats.yellowCards, icon: AlertTriangle, accent: "text-yellow-600" },
    { label: "Reds", value: stats.redCards, icon: AlertTriangle, accent: "text-red-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      {/* Header Section - Better padding and sizing for mobile */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b mb-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/players")} className="rounded-full shrink-0 h-10 w-10 sm:h-12 sm:w-12">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
               <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase leading-none">{player.name}</h1>
               <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary text-primary-foreground rounded-full text-sm sm:text-lg font-bold">#{player.number}</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-lg flex flex-wrap items-center gap-x-2 mt-2">
              <span className="font-semibold text-foreground/80">{player.position}</span> 
              <span>•</span>
              <span className="italic">{team?.name}</span>
              {player.isManager && (
                <span className="ml-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded text-primary">Manager</span>
              )}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid - 2 cols on mobile, 3 on tablet, flex on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3 sm:gap-4 mb-8">
        {statItems.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-card border rounded-2xl p-4 sm:p-5 flex-1 min-w-[140px] flex flex-col items-center shadow-sm relative overflow-hidden ${i === 4 && 'col-span-2 sm:col-span-1'} /* Center the 5th item on mobile */`}
          >
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${s.accent}`}>
                <s.icon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1">{s.label}</p>
            <p className={`text-3xl sm:text-4xl font-black tracking-tighter ${s.accent}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed py-16 bg-transparent">
          <CardContent className="flex flex-col items-center text-center px-6">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-bold">No Match History</h3>
            <p className="text-sm text-muted-foreground">Stats will appear after the first recorded match.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Timeline - Stacked on mobile */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Performance Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <ChartContainer config={performanceChartConfig} className="h-[250px] sm:h-[300px] w-full">
                  <BarChart data={matchChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/20" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="goals" fill="var(--color-goals)" radius={[4, 4, 0, 0]} barSize={window?.innerWidth < 640 ? 12 : 24} />
                    <Bar dataKey="assists" fill="var(--color-assists)" radius={[4, 4, 0, 0]} barSize={window?.innerWidth < 640 ? 12 : 24} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Radar - smaller on mobile */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Ability Radar
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-2 sm:pt-4">
                <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid className="stroke-muted/50" />
                            <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fontWeight: 700 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={3} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Contributions - Table for Desktop, Cards for Mobile */}
          <Card className="overflow-hidden border-none sm:border">
            <CardHeader className="bg-secondary/10 border-b p-4">
              <CardTitle className="text-sm sm:text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
                Recent Contributions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* MOBILE VIEW: List of Cards */}
              <div className="block sm:hidden divide-y divide-border">
                {[...records].reverse().map((r) => (
                  <div key={r.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(parseISO(r.matchDate), "MMM dd, yyyy")}</span>
                      <div className="flex gap-1">
                        {r.yellowCards > 0 && <div className="w-3 h-4 rounded-[2px] bg-yellow-400" />}
                        {r.redCards > 0 && <div className="w-3 h-4 rounded-[2px] bg-red-600" />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">{r.opponent}</span>
                      <div className="flex gap-2">
                        <div className="flex flex-col items-center bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
                          <span className="text-[8px] uppercase text-primary font-black">Goals</span>
                          <span className="font-black text-primary">{r.goals}</span>
                        </div>
                        <div className="flex flex-col items-center bg-accent/5 px-3 py-1 rounded-lg border border-accent/10">
                          <span className="text-[8px] uppercase text-accent font-black">Assists</span>
                          <span className="font-black text-accent">{r.assists}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground text-[10px] font-black uppercase tracking-[0.15em]">
                      <th className="text-left py-4 px-6">Match Date</th>
                      <th className="text-left py-4 px-6">Opponent</th>
                      <th className="text-center py-4 px-4">G</th>
                      <th className="text-center py-4 px-4">A</th>
                      <th className="text-right py-4 px-6">Cards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...records].reverse().map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-4 px-6 font-medium text-muted-foreground">{format(parseISO(r.matchDate), "MMM dd, yyyy")}</td>
                        <td className="py-4 px-6 font-bold">{r.opponent}</td>
                        <td className="text-center py-4 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black ${r.goals > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground/30'}`}>
                                {r.goals}
                            </span>
                        </td>
                        <td className="text-center py-4 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black ${r.assists > 0 ? 'bg-accent/10 text-accent border border-accent/20' : 'text-muted-foreground/30'}`}>
                                {r.assists}
                            </span>
                        </td>
                        <td className="text-right py-4 px-6">
                           <div className="flex items-center justify-end gap-1.5">
                                {r.yellowCards > 0 && <div className="w-3 h-4 rounded-[2px] bg-yellow-400 shadow-sm" />}
                                {r.redCards > 0 && <div className="w-3 h-4 rounded-[2px] bg-red-600 shadow-sm" />}
                                {!r.yellowCards && !r.redCards && <span className="text-muted-foreground/20 text-xs">—</span>}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}