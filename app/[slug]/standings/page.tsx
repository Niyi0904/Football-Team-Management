'use client';

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function StandingsPage() {
  return (
    <ProtectedRoute>
      <StandingsContent />
    </ProtectedRoute>
  );
}

function StandingsContent() {
  const { getStandings } = useAppContext();
  const standings = getStandings();

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Standings</h1>
        <p className="text-muted-foreground mt-1">Season ranking and performance</p>
      </motion.div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-4 text-center w-12">#</th>
                <th className="px-4 py-4">Team</th>
                <th className="px-2 py-4 text-center">P</th>
                <th className="px-2 py-4 text-center hidden md:table-cell">W</th>
                <th className="px-2 py-4 text-center hidden md:table-cell">D</th>
                <th className="px-2 py-4 text-center hidden md:table-cell">L</th>
                <th className="px-2 py-4 text-center">GD</th>
                <th className="px-4 py-4 text-center text-primary">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {standings.map((team: any, index: number) => (
                <motion.tr 
                  key={team.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-primary/5 transition-colors group"
                >
                  <td className="px-4 py-4 text-center font-display font-bold text-muted-foreground group-hover:text-primary">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 rounded-md border border-border">
                        <AvatarImage src={team.logo} />
                        <AvatarFallback style={{ backgroundColor: team.color }} className="text-[10px] text-white">
                          {team.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-sm md:text-base">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center font-medium">{team.played}</td>
                  <td className="px-2 py-4 text-center hidden md:table-cell text-muted-foreground">{team.won}</td>
                  <td className="px-2 py-4 text-center hidden md:table-cell text-muted-foreground">{team.drawn}</td>
                  <td className="px-2 py-4 text-center hidden md:table-cell text-muted-foreground">{team.lost}</td>
                  <td className="px-2 py-4 text-center font-mono text-sm">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-bold text-sm">
                      {team.pts}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {standings.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No matches played yet. The table will update once results are recorded.
        </div>
      )}
    </div>
  );
}






// 'use client';

// import { motion } from "framer-motion";
// import { Trophy, Target, Footprints } from "lucide-react";
// import { useAppContext } from "../context/AppDataContext";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { ProtectedRoute } from "@/components/ProtectedRoute";

// export default function StandingsPage() {
//   return (
//     <ProtectedRoute>
//       <StandingsContent />
//     </ProtectedRoute>
//   );
// }

// function StandingsContent() {
//   const { teams, players, records, getPlayerStats, getTopScorers } = useAppContext();

//   // Build a simple standings table based on match records
//   const teamStats = teams.map((team) => {
//     const teamPlayers = players.filter((p) => p.teamId === team.id);
//     const teamGoalsFor = teamPlayers.reduce((total, p) => {
//       return total + records.filter((r) => r.playerId === p.id).reduce((s, r) => s + r.goals, 0);
//     }, 0);
//     const teamCards = teamPlayers.reduce((total, p) => {
//       const stats = getPlayerStats(p.id);
//       return total + stats.yellowCards + stats.redCards;
//     }, 0);
//     // Simplified: matches = unique match dates for this team's players
//     const matchDates = new Set(
//       records.filter((r) => teamPlayers.some((p) => p.id === r.playerId)).map((r) => r.matchDate)
//     );

//     return {
//       team,
//       played: matchDates.size,
//       goalsFor: teamGoalsFor,
//       cards: teamCards,
//       points: teamGoalsFor * 2, // simplified scoring
//     };
//   }).sort((a, b) => b.points - a.points);

//   const topScorers = getTopScorers();
//   const topAssists = players
//     .map((p) => ({ player: p, stats: getPlayerStats(p.id) }))
//     .sort((a, b) => b.stats.assists - a.stats.assists)
//     .slice(0, 5);

//   return (
//     <div>
//       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
//         <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Standings</h1>
//         <p className="text-muted-foreground mt-1">League table & leaderboards</p>
//       </motion.div>

//       {/* League Table */}
//       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden mb-8">
//         <div className="p-4 border-b border-border flex items-center gap-2">
//           <Trophy className="w-5 h-5 text-accent" />
//           <h2 className="font-display text-lg font-bold">League Table</h2>
//         </div>
//         <Table>
//           <TableHeader>
//             <TableRow className="border-border hover:bg-transparent">
//               <TableHead className="text-muted-foreground w-12">#</TableHead>
//               <TableHead className="text-muted-foreground">Team</TableHead>
//               <TableHead className="text-muted-foreground text-center">P</TableHead>
//               <TableHead className="text-muted-foreground text-center">GF</TableHead>
//               <TableHead className="text-muted-foreground text-center">Cards</TableHead>
//               <TableHead className="text-muted-foreground text-center">Pts</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {teamStats.map((entry, i) => (
//               <TableRow key={entry.team.id} className="border-border">
//                 <TableCell className={`font-display font-bold ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>
//                   {i + 1}
//                 </TableCell>
//                 <TableCell>
//                   <div className="flex items-center gap-3">
//                     <div className="w-6 h-6 rounded" style={{ backgroundColor: entry.team.primaryColor }} />
//                     <span className="font-medium">{entry.team.name}</span>
//                   </div>
//                 </TableCell>
//                 <TableCell className="text-center">{entry.played}</TableCell>
//                 <TableCell className="text-center text-primary font-semibold">{entry.goalsFor}</TableCell>
//                 <TableCell className="text-center text-yellow-card">{entry.cards}</TableCell>
//                 <TableCell className="text-center font-display font-bold text-lg">{entry.points}</TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </motion.div>

//       {/* Leaderboards */}
//       <div className="grid md:grid-cols-2 gap-6">
//         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6">
//           <div className="flex items-center gap-2 mb-4">
//             <Target className="w-5 h-5 text-primary" />
//             <h2 className="font-display text-lg font-bold">Top Scorers</h2>
//           </div>
//           <div className="space-y-2">
//             {topScorers.slice(0, 5).map((entry, i) => {
//               const team = teams.find((t) => t.id === entry.player.teamId);
//               return (
//                 <div key={entry.player.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
//                   <span className={`font-display font-bold w-5 text-center ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>{i + 1}</span>
//                   <div className="flex-1">
//                     <p className="text-sm font-medium">{entry.player.name}</p>
//                     <p className="text-xs text-muted-foreground">{team?.name}</p>
//                   </div>
//                   <span className="font-display text-xl font-bold text-primary">{entry.stats.goals}</span>
//                 </div>
//               );
//             })}
//           </div>
//         </motion.div>

//         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-6">
//           <div className="flex items-center gap-2 mb-4">
//             <Footprints className="w-5 h-5 text-accent" />
//             <h2 className="font-display text-lg font-bold">Top Assists</h2>
//           </div>
//           <div className="space-y-2">
//             {topAssists.map((entry, i) => {
//               const team = teams.find((t) => t.id === entry.player.teamId);
//               return (
//                 <div key={entry.player.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
//                   <span className={`font-display font-bold w-5 text-center ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>{i + 1}</span>
//                   <div className="flex-1">
//                     <p className="text-sm font-medium">{entry.player.name}</p>
//                     <p className="text-xs text-muted-foreground">{team?.name}</p>
//                   </div>
//                   <span className="font-display text-xl font-bold text-accent">{entry.stats.assists}</span>
//                 </div>
//               );
//             })}
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }