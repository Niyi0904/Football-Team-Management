'use client';

import { useAppContext } from "@/app/context/AppDataContext";
import { useState, useMemo, useEffect } from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, ChevronRight, History, UserCheck } from "lucide-react";
import type { MatchAttendance, Player } from "@/app/hooks/useAppData";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEvaluateSuspensions } from '@/app/hooks/useSuspensions';
import { Checkbox } from "@/components/ui/checkbox";


interface EditMatchDialogProps {
  match: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const { teams, players, goals, assists, yellowCards, redCards, attendance, updateMatch, recordMatchStats, deleteMatchEvents } = useAppContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [matchForm, setMatchForm] = useState({ ...match });
  const [playerStats, setPlayerStats] = useState({
    goals: [] as string[],
    assists: [] as string[],
    yellows: [] as string[],
    reds: [] as string[]
  });
  const [presentPlayerIds, setPresentPlayerIds] = useState<string[]>([]);

  const evaluateSuspensions = useEvaluateSuspensions();


  // Sync internal state when match prop changes
  useEffect(() => {
    if (match && open) {
      // 1. Handle Date Parsing — prefer scheduledDate (canonical field),
      //    fall back to legacy date field for documents not yet backfilled.
      let parsedDate = new Date();
      const rawDate = match.scheduledDate || match.date;
      if (rawDate) {
        const d = new Date(rawDate);
        if (isValid(d)) {
          parsedDate = d;
        }
      }

      // 2. Sync the Match Form — store parsed date in local `date` key only for
      //    the calendar picker; it is converted back to scheduledDate on save.
      setMatchForm({ 
        ...match, 
        date: parsedDate,
        report: match.report || "",
        keyMoments: match.keyMoments || ""
      });

      // 3. Helper function to sort events by team (Home first, then Away)
      // This ensures data aligns perfectly with your UI rendering order
      const syncEventStats = (eventArray: any[]) => {
        const matchEvents = eventArray.filter(e => e.matchId === match.id);
        
        const homeEvents = matchEvents
          .filter(e => e.teamId === match.homeTeamId)
          .map(e => e.playerId);
          
        const awayEvents = matchEvents
          .filter(e => e.teamId === match.awayTeamId)
          .map(e => e.playerId);

        // Combine: [HomePlayer1, HomePlayer2, AwayPlayer1, AwayPlayer2]
        return [...homeEvents, ...awayEvents];
      };

      // 4. Update Player Stats state
      setPlayerStats({
        goals: syncEventStats(goals),
        assists: syncEventStats(assists),
        yellows: syncEventStats(yellowCards),
        reds: syncEventStats(redCards),
      });

      setPresentPlayerIds(
        attendance
          .filter((a: MatchAttendance) => a.matchId === match.id && a.present)
          .map((a: MatchAttendance) => a.playerId)
      );

      setStep(1);
    }
  }, [match, open, goals, assists, yellowCards, redCards, attendance]);

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

  const toggleAttendance = (playerId: string, checked: boolean) => {
    setPresentPlayerIds(prev => (
      checked
        ? Array.from(new Set([...prev, playerId]))
        : prev.filter(id => id !== playerId)
    ));
  };

  const setTeamAttendance = (teamPlayers: Player[], present: boolean) => {
    const teamPlayerIds = teamPlayers.map((p) => p.id);
    setPresentPlayerIds(prev => {
      const withoutTeam = prev.filter(id => !teamPlayerIds.includes(id));
      return present ? [...withoutTeam, ...teamPlayerIds] : withoutTeam;
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

      // Convert local `date` (Date object used by the calendar picker) to
      // scheduledDate (canonical ISO string written to Firestore). Never
      // forward the raw `date` key — that field is being removed from the DB.
      const { date, ...restForm } = matchForm;
      const finalMatchData = { 
        ...restForm,
        scheduledDate: (date instanceof Date && isValid(date))
          ? date.toISOString().split('T')[0]
          : matchForm.scheduledDate ?? '',
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
          attendance: presentPlayerIds.map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "", present: true })),
        };
        await recordMatchStats(match.id, matchForm.matchDay, statsToRecord);

        await evaluateSuspensions.mutateAsync({
          matchId:   match.id,
          playerIds: {
            yellows: playerStats.yellows.slice(0, matchForm.homeYellows + matchForm.awayYellows).filter(id => !!id),
            reds:    playerStats.reds.slice(0, matchForm.homeReds + matchForm.awayReds).filter(id => !!id),
          },
        });
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
              {step === 1 ? "Update Match" : step === 2 ? `Events: ${homeTeam?.name} vs ${awayTeam?.name}` : "Match Report & Commentary"}
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
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase">Match Week</label>
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
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-[10px] font-black uppercase">Kickoff</label>
                      <Input 
                        type="time" 
                        value={matchForm.time || "19:00"} 
                        onChange={(e) => setMatchForm({...matchForm, time: e.target.value})} 
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase">League</label>
                      <Input value={matchForm.league} onChange={(e) => setMatchForm({...matchForm, league: e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : step === 2 ? (
                <div className="space-y-12">
                  {/* PLAYER ATTENDANCE */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-sm uppercase flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-600" /> Player Attendance
                      </h3>
                      <span className="text-[10px] font-black uppercase text-muted-foreground">
                        {presentPlayerIds.length} present
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AttendanceTeamList
                        teamName={homeTeam?.name}
                        players={homePlayers}
                        presentPlayerIds={presentPlayerIds}
                        onToggle={toggleAttendance}
                        onSelectAll={(present: boolean) => setTeamAttendance(homePlayers, present)}
                      />
                      <AttendanceTeamList
                        teamName={awayTeam?.name}
                        players={awayPlayers}
                        presentPlayerIds={presentPlayerIds}
                        onToggle={toggleAttendance}
                        onSelectAll={(present: boolean) => setTeamAttendance(awayPlayers, present)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* CONSISTENT EVENT CATEGORIES */}
                  {/* 1. GOALS */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase flex items-center gap-2">⚽ Goal Scorers</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b">{homeTeam?.name}</p>
                        {Array.from({ length: matchForm.homeScore }).map((_, i) => (
                          <SearchablePlayerSelect
                            key={`hg-${i}`}
                            value={playerStats.goals[i]}
                            onChange={(v: string) => updatePlayerList('goals', i, v)}
                            players={homePlayers}
                            placeholder="Scorer"
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayScore }).map((_, i) => (
                          <SearchablePlayerSelect
                            key={`ag-${i}`}
                            value={playerStats.goals[matchForm.homeScore + i]}
                            onChange={(v: string) => updatePlayerList('goals', matchForm.homeScore + i, v)}
                            players={awayPlayers}
                            placeholder="Scorer"
                          />
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
                          <SearchablePlayerSelect 
                            key={`ha-${i}`} 
                            value={playerStats.assists[i]} 
                            onChange={(v: string) => updatePlayerList('assists', i, v)}
                            players={homePlayers}
                            placeholder="Assister"
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-blue-500">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayAssists }).map((_, i) => (
                          <SearchablePlayerSelect 
                            key={`aa-${i}`} 
                            value={playerStats.assists[matchForm.homeAssists + i]} 
                            onChange={(v: string) => updatePlayerList('assists', matchForm.homeAssists + i, v)}
                            players={awayPlayers}
                            placeholder="Assister"
                          />
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
                          <SearchablePlayerSelect 
                            key={`hy-${i}`} 
                            value={playerStats.yellows[i]} 
                            onChange={(v: string) => updatePlayerList('yellows', i, v)}
                            players={homePlayers}
                            placeholder="Select Player"
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-yellow-600">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayYellows }).map((_, i) => (
                          <SearchablePlayerSelect 
                            key={`ay-${i}`} 
                            value={playerStats.yellows[matchForm.homeYellows + i]} 
                            onChange={(v: string) => updatePlayerList('yellows', matchForm.homeYellows + i, v)}
                            players={awayPlayers}
                            placeholder="Select Player"
                          />
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
                          <SearchablePlayerSelect 
                            key={`hr-${i}`} 
                            value={playerStats.reds[i]} 
                            onChange={(v: string) => updatePlayerList('reds', i, v)}
                            players={homePlayers}
                            placeholder="Select Player"
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase border-b text-red-600">{awayTeam?.name}</p>
                        {Array.from({ length: matchForm.awayReds }).map((_, i) => (
                          <SearchablePlayerSelect 
                            key={`ar-${i}`} 
                            value={playerStats.reds[matchForm.homeReds + i]} 
                            onChange={(v: string) => updatePlayerList('reds', matchForm.homeReds + i, v)}
                            players={awayPlayers}
                            placeholder="Select Player"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Narrative Match Report</label>
                    <textarea
                      placeholder="Write a brief summary of how the match went. Who dominated? What were the turning points?"
                      className="w-full min-h-[220px] p-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
                      value={matchForm.report || ""}
                      onChange={(e) => setMatchForm({...matchForm, report: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Timeline Commentary / Key Moments</span>
                      <span className="text-[10px] text-muted-foreground font-normal normal-case">One moment per line. Start with a minute (e.g. 15' - Penalty score).</span>
                    </label>
                    <textarea
                      placeholder="E.g.&#10;5' - Early chance for home team.&#10;45' - Great shot saved by the keeper!&#10;82' - Yellow card for delay of game."
                      className="w-full min-h-[150px] p-4 rounded-xl border border-border bg-card text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
                      value={matchForm.keyMoments || ""}
                      onChange={(e) => setMatchForm({...matchForm, keyMoments: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 border-t bg-secondary/5 flex items-center justify-between gap-4 shrink-0">
          <div className="w-[100px]">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(prev => prev - 1)} 
                className="h-12 w-full"
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex-1">
            {matchForm.status === 'upcoming' ? (
              <Button className="w-full h-12 text-md font-bold bg-blue-600" onClick={handleUpdate} disabled={loading}>{loading ? "Saving..." : "Update Fixture"}</Button>
            ) : step === 1 ? (
              <Button className="w-full h-12 text-md font-bold" onClick={() => setStep(2)}>Sync Player Events <ChevronRight className="ml-2 w-4 h-4"/></Button>
            ) : step === 2 ? (
              <Button className="w-full h-12 text-md font-bold bg-indigo-600 text-white" onClick={() => setStep(3)}>Match Report & Commentary <ChevronRight className="ml-2 w-4 h-4"/></Button>
            ) : (
              <Button className="w-full h-12 text-md font-bold bg-green-600 shadow-lg" onClick={handleUpdate} disabled={loading}>{loading ? "Saving..." : "Finalize Changes"}</Button>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>
  );
}


function SearchablePlayerSelect({ value, onChange, players, placeholder }: any) {
  const [open, setOpen] = useState(false);
  const selectedPlayer = players.find((p: any) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedPlayer ? selectedPlayer.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search player..." />
          <CommandList>
            <CommandEmpty>No player found.</CommandEmpty>
            <CommandGroup>
              {players.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={p.name} // Command uses this for searching
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface AttendanceTeamListProps {
  teamName?: string;
  players: Player[];
  presentPlayerIds: string[];
  onToggle: (playerId: string, checked: boolean) => void;
  onSelectAll: (present: boolean) => void;
}

function AttendanceTeamList({ teamName, players, presentPlayerIds, onToggle, onSelectAll }: AttendanceTeamListProps) {
  return (
    <div className="rounded-2xl border bg-secondary/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <p className="text-[10px] font-black uppercase tracking-widest">{teamName}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] font-black uppercase"
            onClick={() => onSelectAll(true)}
          >
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] font-black uppercase text-muted-foreground"
            onClick={() => onSelectAll(false)}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
        {players.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No players in this team.</p>
        ) : (
          players.map((player) => {
            const checked = presentPlayerIds.includes(player.id);
            return (
              <label
                key={player.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors cursor-pointer",
                  checked ? "bg-green-600/10 border-green-600/30" : "bg-background border-border hover:bg-secondary/40"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggle(player.id, value === true)}
                />
                <span className="font-semibold leading-tight">{player.name}</span>
                <span className="ml-auto text-[10px] font-black text-muted-foreground">#{player.number}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
