import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Target, Users, AlertTriangle, Clock, Trophy, TrendingUp } from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

const performanceChartConfig: ChartConfig = {
  goals: { label: "Goals", color: "hsl(var(--primary))" },
  assists: { label: "Assists", color: "hsl(var(--accent))" },
};

const minutesChartConfig: ChartConfig = {
  minutesPlayed: { label: "Minutes", color: "hsl(var(--primary))" },
};

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { players, teams, getPlayerStats, getPlayerRecords } = useAppContext();

  const player = players.find((p) => p.id === id);
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Player not found</p>
        <Button variant="outline" onClick={() => router.push("/players")}>
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

  // Chart data: goals+assists per match
  const matchChartData = records.map((r) => ({
    date: format(parseISO(r.matchDate), "dd MMM"),
    goals: r.goals,
    assists: r.assists,
  }));

  // Cumulative minutes
  const minutesData = records.reduce<{ date: string; minutesPlayed: number }[]>((acc, r) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].minutesPlayed : 0;
    acc.push({ date: format(parseISO(r.matchDate), "dd MMM"), minutesPlayed: prev + r.minutesPlayed });
    return acc;
  }, []);

  // Radar data
  const maxGoals = Math.max(stats.goals, 1);
  const maxAssists = Math.max(stats.assists, 1);
  const maxMatches = Math.max(stats.matches, 1);
  const radarData = [
    { stat: "Goals", value: (stats.goals / maxGoals) * 100 },
    { stat: "Assists", value: (stats.assists / maxAssists) * 100 },
    { stat: "Matches", value: (stats.matches / maxMatches) * 100 },
    { stat: "Discipline", value: Math.max(0, 100 - (stats.yellowCards * 15 + stats.redCards * 40)) },
    { stat: "Stamina", value: stats.matches > 0 ? Math.min(100, (stats.minutesPlayed / (stats.matches * 90)) * 100) : 0 },
  ];

  const statItems = [
    { label: "Goals", value: stats.goals, icon: Target, accent: "text-primary" },
    { label: "Assists", value: stats.assists, icon: TrendingUp, accent: "text-accent" },
    { label: "Matches", value: stats.matches, icon: Trophy, accent: "text-primary" },
    { label: "Minutes", value: stats.minutesPlayed, icon: Clock, accent: "text-muted-foreground" },
    { label: "Yellow Cards", value: stats.yellowCards, icon: AlertTriangle, accent: "text-yellow-card" },
    { label: "Red Cards", value: stats.redCards, icon: AlertTriangle, accent: "text-red-card" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/players")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{player.name}</h1>
          <p className="text-muted-foreground mt-0.5">
            #{player.number} · {player.position} · {team?.name}
            {player.isManager && " · Manager"}
          </p>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {statItems.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4 text-center"
          >
            <s.icon className={`w-4 h-4 mx-auto mb-2 ${s.accent}`} />
            <p className={`font-display text-2xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No match records yet</p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Goals & Assists per match */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Goals & Assists Per Match</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={performanceChartConfig} className="h-[250px] w-full">
                  <BarChart data={matchChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="goals" fill="var(--color-goals)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="assists" fill="var(--color-assists)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Cumulative minutes */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Cumulative Minutes Played</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={minutesChartConfig} className="h-[250px] w-full">
                  <LineChart data={minutesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="minutesPlayed" stroke="var(--color-minutesPlayed)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Radar */}
            <Card className="glass-card border-border/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Player Profile Radar</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ChartContainer config={{ value: { label: "Rating", color: "hsl(var(--primary))" } }} className="h-[300px] w-full max-w-md">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid className="stroke-border/30" />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Match History */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-display">Match History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Opponent</th>
                      <th className="text-center py-3 px-2">⚽</th>
                      <th className="text-center py-3 px-2">🅰️</th>
                      <th className="text-center py-3 px-2">YC</th>
                      <th className="text-center py-3 px-2">RC</th>
                      <th className="text-center py-3 px-2">Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...records].reverse().map((r) => (
                      <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-2">{format(parseISO(r.matchDate), "dd MMM yyyy")}</td>
                        <td className="py-3 px-2 font-medium">{r.opponent}</td>
                        <td className="text-center py-3 px-2 font-display font-bold text-primary">{r.goals}</td>
                        <td className="text-center py-3 px-2 font-display font-bold text-accent">{r.assists}</td>
                        <td className="text-center py-3 px-2">{r.yellowCards > 0 && <span className="inline-block w-3 h-4 rounded-sm bg-yellow-card" />}</td>
                        <td className="text-center py-3 px-2">{r.redCards > 0 && <span className="inline-block w-3 h-4 rounded-sm bg-red-card" />}</td>
                        <td className="text-center py-3 px-2 text-muted-foreground">{r.minutesPlayed}'</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
