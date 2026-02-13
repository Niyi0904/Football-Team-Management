'use client';

import { useAppContext } from "@/app/context/AppDataContext";
import { useState, useMemo, useEffect } from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, ChevronRight, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Select } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EditMatchDialogProps {
  match: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const { teams, players, goals, assists, yellowCards, redCards, updateMatch, recordMatchStats, deleteMatchEvents } = useAppContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [matchForm, setMatchForm] = useState({ ...match });
  const [playerStats, setPlayerStats] = useState({
    goals: [] as string[],
    assists: [] as string[],
    yellows: [] as string[],
    reds: [] as string[]
  });

  // Sync internal state when match prop changes
  useEffect(() => {
    if (match && open) {

        let parsedDate = new Date(); // Default fallback
    
        if (match.date) {
        const d = new Date(match.date);
        if (isValid(d)) {
            parsedDate = d;
        }
        }

        setMatchForm({ 
        ...match, 
        date: parsedDate 
        });
      
      setPlayerStats({
        goals: goals.filter(g => g.matchId === match.id).map(g => g.playerId),
        assists: assists.filter(a => a.matchId === match.id).map(a => a.playerId),
        yellows: yellowCards.filter(y => y.matchId === match.id).map(y => y.playerId),
        reds: redCards.filter(r => r.matchId === match.id).map(r => r.playerId),
      });
      setStep(1);
    }
  }, [match, open, goals, assists, yellowCards, redCards]);

  const homeTeam = useMemo(() => teams.find(t => t.id === matchForm.homeTeamId), [matchForm.homeTeamId, teams]);
  const awayTeam = useMemo(() => teams.find(t => t.id === matchForm.awayTeamId), [matchForm.awayTeamId, teams]);
  const homePlayers = useMemo(() => players.filter(p => p.teamId === matchForm.homeTeamId), [matchForm.homeTeamId, players]);
  const awayPlayers = useMemo(() => players.filter(p => p.teamId === matchForm.awayTeamId), [matchForm.awayTeamId, players]);

  const updatePlayerList = (type: 'goals' | 'assists' | 'yellows' | 'reds', index: number, value: string) => {
    setPlayerStats(prev => {
      const newList = [...prev[type]];
      newList[index] = value;
      return { ...prev, [type]: newList };
    });
  };

  const handleUpdate = async () => {
    if (matchForm.homeTeamId === matchForm.awayTeamId) {
      alert("Error: A team cannot play against itself.");
      return;
    }
    setLoading(true);
    try {
      // Points calculation
      let homePoints = 0, awayPoints = 0;
      if (matchForm.status === 'played') {
        if (matchForm.homeScore > matchForm.awayScore) homePoints = 3;
        else if (matchForm.homeScore < matchForm.awayScore) awayPoints = 3;
        else { homePoints = 1; awayPoints = 1; }
      }

      const finalMatchData = { 
        ...matchForm, 
        homePoints, 
        awayPoints,
        homeScore: matchForm.status === 'upcoming' ? 0 : matchForm.homeScore,
        awayScore: matchForm.status === 'upcoming' ? 0 : matchForm.awayScore,
      };

      await updateMatch(match.id, finalMatchData);
      await deleteMatchEvents(match.id);
      
      if (matchForm.status === 'played') {
        const statsToRecord = {
          goals: playerStats.goals.slice(0, matchForm.homeScore + matchForm.awayScore).filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          assists: playerStats.assists.slice(0, matchForm.homeAssists + matchForm.awayAssists).filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          yellows: playerStats.yellows.slice(0, matchForm.homeYellows + matchForm.awayYellows).filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          reds: playerStats.reds.slice(0, matchForm.homeReds + matchForm.awayReds).filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
        };
        await recordMatchStats(match.id, matchForm.matchDay, statsToRecord);
      }

      onOpenChange(false);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-bold">
              {step === 1 ? "Update Match" : `Events: ${homeTeam?.name} vs ${awayTeam?.name}`}
            </DialogTitle>
            
            {step === 1 && (
              <Tabs value={matchForm.status} onValueChange={(v: any) => setMatchForm({...matchForm, status: v})} className="w-[240px]">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="upcoming" className="gap-2 text-xs"><CalendarIcon className="w-3 h-3" /> Upcoming</TabsTrigger>
                  <TabsTrigger value="played" className="gap-2 text-xs"><History className="w-3 h-3" /> Played</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6">
            <div className="pb-10 pt-4">
              {step === 1 ? (
                <div className="space-y-6">
                  {matchForm.status === 'upcoming' ? (
                    <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-secondary/5">
                      <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                      <h3 className="text-lg font-semibold">Fixture Mode</h3>
                      <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">Scores and events are hidden for upcoming fixtures.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Home Team Stats */}
                      <div className="space-y-4 p-5 border rounded-2xl bg-secondary/10">
                        <h4 className="font-bold text-sm text-center border-b pb-2 uppercase">{homeTeam?.name}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><label className="text-[10px] font-bold">Goals</label>
                            <Input type="number" value={matchForm.homeScore} onChange={(e) => setMatchForm({...matchForm, homeScore: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">Assists</label>
                            <Input type="number" value={matchForm.homeAssists} onChange={(e) => setMatchForm({...matchForm, homeAssists: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">🟨 Yellows</label>
                            <Input type="number" value={matchForm.homeYellows} onChange={(e) => setMatchForm({...matchForm, homeYellows: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">🟥 Reds</label>
                            <Input type="number" value={matchForm.homeReds} onChange={(e) => setMatchForm({...matchForm, homeReds: +e.target.value})} />
                          </div>
                        </div>
                      </div>
                      {/* Away Team Stats */}
                      <div className="space-y-4 p-5 border rounded-2xl bg-secondary/10">
                        <h4 className="font-bold text-sm text-center border-b pb-2 uppercase">{awayTeam?.name}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><label className="text-[10px] font-bold">Goals</label>
                            <Input type="number" value={matchForm.awayScore} onChange={(e) => setMatchForm({...matchForm, awayScore: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">Assists</label>
                            <Input type="number" value={matchForm.awayAssists} onChange={(e) => setMatchForm({...matchForm, awayAssists: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">🟨 Yellows</label>
                            <Input type="number" value={matchForm.awayYellows} onChange={(e) => setMatchForm({...matchForm, awayYellows: +e.target.value})} />
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold">🟥 Reds</label>
                            <Input type="number" value={matchForm.awayReds} onChange={(e) => setMatchForm({...matchForm, awayReds: +e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match Metadata Info Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-xl bg-primary/5">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase">Match Day</label>
                      <Input type="number" value={matchForm.matchDay} onChange={(e) => setMatchForm({...matchForm, matchDay: +e.target.value})} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><label className="text-[10px] font-black uppercase">Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />
                              {matchForm.date && isValid(new Date(matchForm.date)) ? (
                                format(new Date(matchForm.date), "PPP")
                                ) : (
                                <span className="text-muted-foreground italic">Pick match date</span>
                                )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={matchForm.date} onSelect={(d) => d && setMatchForm({...matchForm, date: d})} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase">League</label>
                      <Input value={matchForm.league} onChange={(e) => setMatchForm({...matchForm, league: e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* CONSISTENT EVENT CATEGORIES */}
                  {/* 1. GOALS */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase flex items-center gap-2">⚽ Goal Scorers</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b">{homeTeam?.name}</p>
                        {Array.from({ length: matchForm.homeScore }).map((_, i) => (
                          <Select key={`hg-${i}`} value={playerStats.goals[i]} onValueChange={(v) => updatePlayerList('goals', i, v)}>
                            <SelectTrigger><SelectValue placeholder="Scorer" /></SelectTrigger>
                            <SelectContent>{homePlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayScore }).map((_, i) => (
                          <Select key={`ag-${i}`} value={playerStats.goals[matchForm.homeScore + i]} onValueChange={(v) => updatePlayerList('goals', matchForm.homeScore + i, v)}>
                            <SelectTrigger><SelectValue placeholder="Scorer" /></SelectTrigger>
                            <SelectContent>{awayPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. ASSISTS */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-blue-500 flex items-center gap-2">👟 Assists</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-blue-500">{homeTeam?.name}</p>
                        {Array.from({ length: matchForm.homeAssists }).map((_, i) => (
                          <Select key={`ha-${i}`} value={playerStats.assists[i]} onValueChange={(v) => updatePlayerList('assists', i, v)}>
                            <SelectTrigger><SelectValue placeholder="Assister" /></SelectTrigger>
                            <SelectContent>{homePlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-blue-500">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayAssists }).map((_, i) => (
                          <Select key={`aa-${i}`} value={playerStats.assists[matchForm.homeAssists + i]} onValueChange={(v) => updatePlayerList('assists', matchForm.homeAssists + i, v)}>
                            <SelectTrigger><SelectValue placeholder="Assister" /></SelectTrigger>
                            <SelectContent>{awayPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. YELLOW CARDS */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-yellow-600 flex items-center gap-2">🟨 Yellow Cards</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-yellow-600">{homeTeam?.name}</p>
                        {Array.from({ length: matchForm.homeYellows }).map((_, i) => (
                          <Select key={`hy-${i}`} value={playerStats.yellows[i]} onValueChange={(v) => updatePlayerList('yellows', i, v)}>
                            <SelectTrigger><SelectValue placeholder="Player" /></SelectTrigger>
                            <SelectContent>{homePlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-yellow-600">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayYellows }).map((_, i) => (
                          <Select key={`ay-${i}`} value={playerStats.yellows[matchForm.homeYellows + i]} onValueChange={(v) => updatePlayerList('yellows', matchForm.homeYellows + i, v)}>
                            <SelectTrigger><SelectValue placeholder="Player" /></SelectTrigger>
                            <SelectContent>{awayPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. RED CARDS */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-red-600 flex items-center gap-2">🟥 Red Cards</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-red-600">{homeTeam?.name}</p>
                        {Array.from({ length: matchForm.homeReds }).map((_, i) => (
                          <Select key={`hr-${i}`} value={playerStats.reds[i]} onValueChange={(v) => updatePlayerList('reds', i, v)}>
                            <SelectTrigger><SelectValue placeholder="Player" /></SelectTrigger>
                            <SelectContent>{homePlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-red-600">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayReds }).map((_, i) => (
                          <Select key={`ar-${i}`} value={playerStats.reds[matchForm.homeReds + i]} onValueChange={(v) => updatePlayerList('reds', matchForm.homeReds + i, v)}>
                            <SelectTrigger><SelectValue placeholder="Player" /></SelectTrigger>
                            <SelectContent>{awayPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 border-t bg-secondary/5 flex items-center justify-between gap-4 shrink-0">
          <div className="w-[100px]">{step === 2 && <Button variant="outline" onClick={() => setStep(1)} className="h-12 w-full">Back</Button>}</div>
          <div className="flex-1">
            {matchForm.status === 'upcoming' ? (
              <Button className="w-full h-12 text-md font-bold bg-blue-600" onClick={handleUpdate} disabled={loading}>{loading ? "Saving..." : "Update Fixture"}</Button>
            ) : step === 1 ? (
              <Button className="w-full h-12 text-md font-bold" onClick={() => setStep(2)}>Sync Player Events <ChevronRight className="ml-2 w-4 h-4"/></Button>
            ) : (
              <Button className="w-full h-12 text-md font-bold bg-green-600 shadow-lg" onClick={handleUpdate} disabled={loading}>{loading ? "Saving..." : "Finalize Changes"}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}