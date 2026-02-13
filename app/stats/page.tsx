'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Target, AlertTriangle, 
  Search, TrendingUp, ChevronRight,
  Medal, ShieldAlert
} from "lucide-react";
import { useAppContext } from "../context/AppDataContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type StatTab = "goals" | "assists" | "cards";

export default function StatsPage() {
  const { teams, players, goals, assists, yellowCards, redCards } = useAppContext();
  const [activeTab, setActiveTab] = useState<StatTab>("goals");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Process Raw Data into a Leaderboard
  const leaderboard = players.map(player => {
    return {
      player,
      stats: {
        goals: goals.filter(g => g.playerId === player.id).length,
        assists: assists.filter(a => a.playerId === player.id).length,
        yellowCards: yellowCards.filter(y => y.playerId === player.id).length,
        redCards: redCards.filter(r => r.playerId === player.id).length,
        totalCards: 0 // Will calculate below
      }
    };
  }).map(item => ({
    ...item,
    stats: {
      ...item.stats,
      totalCards: item.stats.yellowCards + item.stats.redCards
    }
  }));

  // 2. Filter and Sort based on the Active Tab
  const filteredStats = leaderboard
    .filter(item => 
      item.player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (activeTab === "goals") return b.stats.goals - a.stats.goals;
      if (activeTab === "assists") return b.stats.assists - a.stats.assists;
      return b.stats.totalCards - a.stats.totalCards;
    })
    // Filter out players with 0 stats unless the user is searching for them specifically
    .filter(item => {
      if (searchQuery !== "") return true;
      if (activeTab === "goals") return item.stats.goals > 0;
      if (activeTab === "assists") return item.stats.assists > 0;
      return item.stats.totalCards > 0;
    });

  const getStatValue = (item: any) => {
    if (activeTab === "goals") return item.stats.goals;
    if (activeTab === "assists") return item.stats.assists;
    return item.stats.totalCards;
  };
  
  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">League Leaders</h1>
          <p className="text-muted-foreground">Individual player performance tracking</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search player..." 
            className="pl-10 bg-secondary/50 border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Custom Tab Switcher */}
      <div className="flex p-1 bg-secondary/50 rounded-xl mb-8 border border-border/50">
        {(['goals', 'assists', 'cards'] as StatTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === 'goals' && <Target className="w-4 h-4" />}
            {tab === 'assists' && <TrendingUp className="w-4 h-4" />}
            {tab === 'cards' && <ShieldAlert className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Stats List */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {filteredStats.map((item, index) => {
            const team = teams.find(t => t.id === item.player.teamId);
            const value = getStatValue(item);

            if (value === 0 && searchQuery === "") return null; // Don't show zero stats unless searching

            return (
              <motion.div
                key={`${activeTab}-${item.player.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link 
                  href={`/players/${item.player.id}`}
                  className="group flex items-center justify-between p-4 bg-card border border-border/50 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 font-display text-lg font-black text-muted-foreground/50 group-hover:text-primary transition-colors">
                      {index + 1}
                    </div>
                    
                    <Avatar className="w-12 h-12 rounded-xl border-2 border-secondary shadow-sm">
                      <AvatarImage src={item.player.photo || ''} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-xs font-bold">{item.player.name.substring(0,2)}</AvatarFallback>
                    </Avatar>

                    <div>
                      <h3 className="font-bold text-base leading-tight group-hover:underline">{item.player.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team?.primaryColor }} />
                        {team?.name || "Independent"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Visual breakdown for cards */}
                    {activeTab === "cards" && (
                      <div className="hidden md:flex gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-3 bg-yellow-500 rounded-sm" />
                          <span className="text-xs font-bold">{item.stats.yellowCards}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-3 bg-red-600 rounded-sm" />
                          <span className="text-xs font-bold">{item.stats.redCards}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-right min-w-[60px]">
                      <div className={`text-2xl font-black leading-none ${
                        activeTab === 'goals' ? 'text-primary' : 
                        activeTab === 'assists' ? 'text-accent' : 
                        'text-destructive'
                      }`}>
                        {value}
                      </div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                        {activeTab}
                      </p>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredStats.length === 0 && (
          <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
            <Medal className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No stats found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}