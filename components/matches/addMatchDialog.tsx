'use client';

import { useAppContext } from "@/app/context/AppDataContext";
import { useState, useMemo } from "react";
import { format } from "date-fns";
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
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface AddMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function AddMatchDialog({ open, onOpenChange }: AddMatchDialogProps) {
  const { teams, players, addMatch, recordMatchStats } = useAppContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [matchForm, setMatchForm] = useState({
    homeTeamId: "", awayTeamId: "",
    homeScore: 0, awayScore: 0,
    homeAssists: 0, awayAssists: 0,
    homeYellows: 0, awayYellows: 0,
    homeReds: 0, awayReds: 0,
    minutesPlayed: 90,
    matchDay: 1,
    time: "19:00", // Add this field
    date: new Date(),
    league: "Seasonal League",
    status: "played" 
  });

  const [playerStats, setPlayerStats] = useState<{
    goals: string[], assists: string[], yellows: string[], reds: string[]
  }>({ goals: [], assists: [], yellows: [], reds: [] });

  const homeTeam = useMemo(() => teams.find(t => t.id === matchForm.homeTeamId), [matchForm.homeTeamId, teams]);
  const awayTeam = useMemo(() => teams.find(t => t.id === matchForm.awayTeamId), [matchForm.awayTeamId, teams]);
  const homePlayers = useMemo(() => players.filter(p => p.teamId === matchForm.homeTeamId), [matchForm.homeTeamId, players]);
  const awayPlayers = useMemo(() => players.filter(p => p.teamId === matchForm.awayTeamId), [matchForm.awayTeamId, players]);

  const handleNextStep = () => {
    if (!matchForm.homeTeamId || !matchForm.awayTeamId) return alert("Select teams first");
    if (matchForm.homeTeamId === matchForm.awayTeamId) return alert("Teams must be different");
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (matchForm.homeTeamId === matchForm.awayTeamId) {
      return alert("Error: A team cannot play against itself.");
    }
    setLoading(true);
    try {
      const submissionData = {
        ...matchForm,
        homeScore: matchForm.status === 'upcoming' ? 0 : matchForm.homeScore,
        awayScore: matchForm.status === 'upcoming' ? 0 : matchForm.awayScore,
      };

      const matchResult = await addMatch(submissionData);
      
      if (matchResult?.id && matchForm.status === 'played') {
        const statsToRecord = {
          goals: playerStats.goals.filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          assists: playerStats.assists.filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          yellows: playerStats.yellows.filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
          reds: playerStats.reds.filter(id => !!id).map(pid => ({ playerId: pid, teamId: players.find(p => p.id === pid)?.teamId || "" })),
        };
        await recordMatchStats(matchResult.id, matchResult.matchDay, statsToRecord);
      }
      
      onOpenChange(false);
      resetForm();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setStep(1);
    setMatchForm({
      homeTeamId: "", awayTeamId: "",
      homeScore: 0, awayScore: 0,
      homeAssists: 0, awayAssists: 0,
      homeYellows: 0, awayYellows: 0,
      homeReds: 0, awayReds: 0,
      minutesPlayed: 90,
      matchDay: 1,
      time: "19:00", // Add this field
      date: new Date(),
      league: "Seasonal League",
      status: "played"
    });
    setPlayerStats({ goals: [], assists: [], yellows: [], reds: [] });
  };

  const updatePlayerList = (type: 'goals' | 'assists' | 'yellows' | 'reds', index: number, value: string) => {
    setPlayerStats(prev => {
      const newList = [...prev[type]];
      newList[index] = value;
      return { ...prev, [type]: newList };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if(!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
        
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-bold">
              {step === 1 ? "Add Match" : `Events: ${homeTeam?.name} vs ${awayTeam?.name}`}
            </DialogTitle>

            {step === 1 && (
              <Tabs value={matchForm.status} onValueChange={(v: any) => setMatchForm({...matchForm, status: v})} className="w-[240px]">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="upcoming" className="gap-2 text-xs"><CalendarIcon className="w-3 h-3"/>Upcoming</TabsTrigger>
                  <TabsTrigger value="played" className="gap-2 text-xs"><History className="w-3 h-3"/>Played</TabsTrigger>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* HOME TEAM */}
                    <div className="space-y-4 p-5 border rounded-2xl bg-secondary/10">
                      <h4 className="font-bold text-sm text-muted-foreground uppercase text-center border-b pb-2">Home Side</h4>
                      <Select onValueChange={(v) => setMatchForm({...matchForm, homeTeamId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                        <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                      
                      {matchForm.status === 'played' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Goals" onChange={(e) => setMatchForm({...matchForm, homeScore: +e.target.value})} />
                          <Input type="number" placeholder="Assists" onChange={(e) => setMatchForm({...matchForm, homeAssists: +e.target.value})} />
                          <Input type="number" placeholder="🟨 Yellows" onChange={(e) => setMatchForm({...matchForm, homeYellows: +e.target.value})} />
                          <Input type="number" placeholder="🟥 Reds" onChange={(e) => setMatchForm({...matchForm, homeReds: +e.target.value})} />
                        </div>
                      )}
                    </div>

                    {/* AWAY TEAM */}
                    <div className="space-y-4 p-5 border rounded-2xl bg-secondary/10">
                      <h4 className="font-bold text-sm text-muted-foreground uppercase text-center border-b pb-2">Away Side</h4>
                      <Select onValueChange={(v) => setMatchForm({...matchForm, awayTeamId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                        <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>

                      {matchForm.status === 'played' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Goals" onChange={(e) => setMatchForm({...matchForm, awayScore: +e.target.value})} />
                          <Input type="number" placeholder="Assists" onChange={(e) => setMatchForm({...matchForm, awayAssists: +e.target.value})} />
                          <Input type="number" placeholder="🟨 Yellows" onChange={(e) => setMatchForm({...matchForm, awayYellows: +e.target.value})} />
                          <Input type="number" placeholder="🟥 Reds" onChange={(e) => setMatchForm({...matchForm, awayReds: +e.target.value})} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MATCH SETTINGS */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-xl bg-primary/5">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-primary/70">Match Week</label>
                      <Input type="number" value={matchForm.matchDay} onChange={(e) => setMatchForm({...matchForm, matchDay: +e.target.value})} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><label className="text-[10px] font-black uppercase text-primary/70">Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />
                              {matchForm.date ? format(matchForm.date, "PPP") : <span>Pick date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={matchForm.date} onSelect={(d) => d && setMatchForm({...matchForm, date: d})} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-primary/70">Kickoff Time</label>
                      <Input 
                        type="time" 
                        value={matchForm.time} 
                        onChange={(e) => setMatchForm({...matchForm, time: e.target.value})} 
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-primary/70">Minutes</label>
                      <Input type="number" value={matchForm.minutesPlayed} onChange={(e) => setMatchForm({...matchForm, minutesPlayed: +e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* GOALS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="text-lg">⚽</span><h3 className="font-bold text-sm uppercase">Goal Scorers</h3></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-primary uppercase border-b">{homeTeam?.name}</p>
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
                        <p className="text-[10px] font-bold text-primary uppercase border-b">{awayTeam?.name}</p>
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

                  {/* ASSISTS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="text-lg">👟</span><h3 className="font-bold text-sm uppercase text-blue-500">Assists</h3></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-blue-500 uppercase border-b">{homeTeam?.name}</p>
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
                        <p className="text-[10px] font-bold text-blue-500 uppercase border-b">{awayTeam?.name}</p>
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

                  {/* YELLOW CARDS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="text-lg">🟨</span><h3 className="font-bold text-sm uppercase text-yellow-600">Yellow Cards</h3></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-yellow-600 uppercase border-b">{homeTeam?.name}</p>
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
                        <p className="text-[10px] font-bold text-yellow-600 uppercase border-b">{awayTeam?.name}</p>
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

                  {/* RED CARDS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="text-lg">🟥</span><h3 className="font-bold text-sm uppercase text-red-600">Red Cards</h3></div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-red-600 uppercase border-b">{homeTeam?.name}</p>
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
                        <p className="text-[10px] font-bold text-red-600 uppercase border-b">{awayTeam?.name}</p>
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
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 border-t bg-secondary/5 flex items-center justify-between gap-4 shrink-0">
          <div className="w-[100px]">{step === 2 && <Button variant="outline" onClick={() => setStep(1)} className="h-12 w-full">Back</Button>}</div>
          <div className="flex-1">
            {matchForm.status === 'upcoming' ? (
              <Button className="w-full h-12 text-md font-bold bg-blue-600" onClick={handleFinalSubmit} disabled={loading}>{loading ? "Saving..." : "Schedule Fixture"}</Button>
            ) : step === 1 ? (
              <Button className="w-full h-12 text-md font-bold" onClick={handleNextStep}>Assign Players <ChevronRight className="ml-2 w-4 h-4"/></Button>
            ) : (
              <Button className="w-full h-12 text-md font-bold bg-green-600" onClick={handleFinalSubmit} disabled={loading}>{loading ? "Saving..." : "Finalize Report"}</Button>
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