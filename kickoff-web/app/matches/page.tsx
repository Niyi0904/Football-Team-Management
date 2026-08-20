'use client';

import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Clock, Calendar, Plus, Trophy, MoreVertical, Trash2, Edit2, Sparkles, AlertTriangle } from "lucide-react";
import { useAppContext } from "@/app/context/AppDataContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AddMatchDialog } from "@/components/matches/addMatchDialog";
import { EditMatchDialog } from "@/components/matches/editMatchDialog";
import { MatchDetailsDialog } from "@/components/matches/matchDetailsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Match } from "../hooks/useAppData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useRef } from "react";
import { domToPng } from 'modern-screenshot';
import { Download } from "lucide-react";
import { FixtureLoadingOverlay } from "@/components/FixtureLoadingOverlay";
import { DeleteLoadingOverlay } from "@/components/DeleteLoadingOverlay";
import { GenerateFixturesDialog } from "@/components/GenerateFixturesDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { generateFixtures, formatTime12h } from '@/lib/fixtures';
import { useLeagueSettings } from "../hooks/use-leagueSettings";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function MatchRecordsPage() {
  return (
    <ProtectedRoute>
      <MatchRecordsContent />
    </ProtectedRoute>
  );
}


function MatchRecordsContent() {
  const { matches, teams, isAdmin, deleteMatch, addMatchesBatch, deleteAllMatches } = useAppContext();
  const { matchDay, defaultTime, seasonName } = useLeagueSettings();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [matchToEdit, setMatchToEdit] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenDialogOpen, setIsGenDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [weekToDelete, setWeekToDelete] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  const handleAutoGenerate = async (weekCount: number) => {
    if (teams.length < 2) return alert("Add more teams first!");

    const lastWeek = matches.length > 0
      ? Math.max(...matches.map(m => m.matchDay || 0))
      : 0;

    const lastMatchInstance = matches.length > 0
      ? [...matches].sort((a, b) =>
        new Date(b.scheduledDate || 0).getTime() - new Date(a.scheduledDate || 0).getTime()
      )[0]
      : null;

    setIsGenerating(true);
    try {
      const newFixtures = generateFixtures(
        teams,
        weekCount,
        lastWeek + 1,
        matchDay,       // ← from useLeagueSettings, was hardcoded "Tuesday"
        defaultTime,    // ← from useLeagueSettings, was hardcoded "10:00"
        lastMatchInstance?.scheduledDate,
        seasonName,     // ← from useLeagueSettings, was hardcoded "Seasonal League"
      );
      await addMatchesBatch(newFixtures as any);
      setFilter('upcoming');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAllWeeks = async () => {
    if (matches.length === 0) {
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      // ✅ One batched operation instead of looping deleteMatch() per match
      await deleteAllMatches();
    } catch (error) {
      console.error("Failed to clear database:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteMatchWeek = async () => {
    if (!weekToDelete) return;
    const matchesInWeek = groupedMatches[weekToDelete];

    setIsDeleting(true);
    try {
      for (const match of matchesInWeek) {
        await deleteMatch(match.id);
      }
    } catch (error) {
      console.error("Failed to delete week:", error);
    } finally {
      setIsDeleting(false);
      setWeekToDelete(null);
    }
  };

  const appBg = getComputedStyle(document.body).backgroundColor;

  const downloadSpecificDay = async (dayId: string) => {
    const element = document.getElementById(`day-section-${dayId}`);
    if (!element) return;

    try {
      const dataUrl = await domToPng(element, {
        scale: 3, // High quality for sharing
        backgroundColor: appBg, // Ensures no transparency issues on WhatsApp/Discord
        quality: 1,
      });

      const link = document.createElement('a');
      link.download = `Match-Week-${dayId}-Report.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const downloadMatchWeek = async () => {
    if (!exportRef.current) return;

    try {
      const dataUrl = await domToPng(exportRef.current, {
        scale: 2,
        backgroundColor: appBg,
      });

      const link = document.createElement('a');
      link.download = `Full-Match-Records.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Full export failed", err);
    }
  };

  // New Filter State
  const [filter, setFilter] = useState<'all' | 'played' | 'upcoming'>('all');

  // Filter Logic - Using useMemo for performance
  const filteredMatches = useMemo(() => {
    if (filter === 'all') return matches;
    return matches.filter(m => m.status === filter);
  }, [matches, filter]);

  // Grouping logic applied to filtered results
  const groupedMatches = filteredMatches.reduce((acc: any, match) => {
    const day = match.matchDay || 0;
    if (!acc[day]) acc[day] = [];
    acc[day].push(match);
    return acc;
  }, {});

  const matchDays = Object.keys(groupedMatches).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-10 pb-20 px-4 min-w-0">
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FixtureLoadingOverlay />
          </motion.div>
        )}

        {isDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DeleteLoadingOverlay message="Clearing Week Fixtures" />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Match Records</h1>
          <p className="text-muted-foreground mt-1">Fixtures and season results</p>
        </motion.div>

        <div className="flex items-center gap-3">
          {/* Filter UI - Strictly obeying current style */}
          <div className="flex p-1 bg-secondary/30 rounded-xl border border-border/50">
            {(['all', 'played', 'upcoming'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === f ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {isAdmin && (
            <>
              {/* MOBILE VIEW: Add Match + Dropdown Menu */}
              <div className="flex md:hidden items-center gap-2">
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" /> Add Match
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setIsGenDialogOpen(true)} disabled={isGenerating}>
                      <Sparkles className="w-4 h-4 mr-2 text-primary" /> Auto-Gen Fixtures
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadMatchWeek}>
                      <Download className="w-4 h-4 mr-2" /> Download UI
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting || isGenerating}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Clear All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* DESKTOP VIEW: Full Horizontal Row */}
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting || isGenerating}
                  className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setIsGenDialogOpen(true)}
                  disabled={isGenerating}
                  className="gap-2 border-primary/20"
                >
                  <Sparkles className={cn("w-4 h-4 text-primary", isGenerating && "animate-spin")} />
                  {isGenerating ? "Generating..." : "Auto-Gen Fixtures"}
                </Button>

                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" /> Add Match
                </Button>

                <Button variant="outline" onClick={downloadMatchWeek} className="gap-2">
                  <Download className="w-4 h-4" /> Download UI
                </Button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* MATCH LIST SECTION */}
      <section className="space-y-6" ref={exportRef}>
        <AnimatePresence mode="popLayout">
          {matchDays.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-secondary/5 rounded-3xl border-dashed border-2"
            >
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No matches found for this filter.</p>
            </motion.div>
          ) : (
            <Accordion type="multiple" defaultValue={[matchDays[0]]} className="space-y-6">
              {matchDays.map((day) => (
                <AccordionItem key={day} value={day} className="border-none">
                  <motion.div
                    key={day}
                    id={`day-section-${day}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 rounded-3xl"
                  >
                    <div className="flex items-center justify-between gap-4 w-full">
                      <AccordionTrigger className="hover:no-underline py-0 group">
                        <div className="flex items-center gap-4 w-full">
                          <Badge variant="outline" className="px-3 py-1 font-bold bg-background shadow-sm transition-colors group-data-[state=open]:border-primary group-data-[state=open]:text-primary">
                            Match Week {day}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <div className="h-px flex-1 bg-border" />

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents the accordion from toggling
                            downloadSpecificDay(day);
                          }}
                          className="text-[10px] font-bold uppercase tracking-tighter"
                        >
                          <Download className="w-3 h-3 mr-1" />
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWeekToDelete(day); // opens ConfirmDialog below
                            }}
                            className="h-8 w-8 p-0 hover:text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <AccordionContent className="pt-4 pb-2 px-1">
                      <div className="grid gap-4">
                        {groupedMatches[day].map((match: any) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            teams={teams}
                            isAdmin={isAdmin}
                            onEdit={(m: Match) => { setMatchToEdit(m); setIsEditDialogOpen(true); }}
                            onDelete={deleteMatch}
                            onViewDetails={(m: Match) => {
                              setSelectedMatch(m);
                              setIsDetailsOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </motion.div>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </AnimatePresence>
      </section>

      <AddMatchDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {matchToEdit && (
        <EditMatchDialog
          match={matchToEdit}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      <GenerateFixturesDialog
        open={isGenDialogOpen}
        onOpenChange={setIsGenDialogOpen}
        onConfirm={handleAutoGenerate}
      />
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Extreme Action Required
            </DialogTitle>
            <DialogDescription>
              You are about to wipe the entire season's fixtures. This will delete all
              <strong> {matches.length} matches</strong> permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAllWeeks}>
              Yes, Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MatchDetailsDialog
        match={selectedMatch}
        open={isDetailsOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedMatch(null);
          setIsDetailsOpen(open);
        }}
      />

      <ConfirmDialog
        open={weekToDelete !== null}
        onOpenChange={(open) => !open && setWeekToDelete(null)}
        title={`Delete Match Week ${weekToDelete}?`}
        description={
          <>
            This will permanently delete all{" "}
            <span className="font-semibold text-foreground">
              {weekToDelete ? groupedMatches[weekToDelete]?.length : 0} fixtures
            </span>{" "}
            in Match Week {weekToDelete}. Goals, assists, and cards for these
            matches will also be removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete Week"
        onConfirm={handleDeleteMatchWeek}
        loading={isDeleting}
      />
    </div>
  );
}

function MatchCard({ match, teams, isAdmin, onEdit, onDelete, onViewDetails }: any) {
  const homeTeam = teams.find((t: any) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t: any) => t.id === match.awayTeamId);
  const isPlayed = match.status === 'played';
  const formattedTime = useMemo(() => formatTime12h(match.time), [match.time]);
  const formattedDate = useMemo(
    () => match.scheduledDate
      ? new Date(match.scheduledDate).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null,
    [match.scheduledDate]
  );

  const [deleteOpen, setDeleteOpen] = useState(false);


  return (
    <motion.div
      layout
      className={cn(
        "relative group p-4 lg:p-6 rounded-2xl transition-all duration-300 border-2",
        isPlayed
          ? "bg-card border-border hover:border-primary/30 shadow-sm"
          : "bg-primary/[0.02] border-dashed border-primary/20 hover:border-primary/40"
      )}
    >
      {/* Admin Menu */}
      {isAdmin && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(match)}>
                <Edit2 className="w-4 h-4 mr-2" /> {isPlayed ? "Edit Report" : "Enter Result"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Home Team */}
        <div className="flex flex-1 items-center justify-end gap-4 w-full md:w-auto">
          <span className={cn("font-bold text-lg hidden md:block", !isPlayed && "text-foreground")}>
            {homeTeam?.name}
          </span>
          <Avatar className="w-12 h-12 rounded-xl border-2 border-background shadow-sm">
            <AvatarImage src={homeTeam?.logo || undefined} />
            <AvatarFallback style={{ backgroundColor: homeTeam?.primaryColor }} className="text-white font-bold">
              {homeTeam?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center gap-3">
          {isPlayed ? (
            <div className="flex items-center gap-5 bg-secondary/40 px-6 py-2.5 rounded-2xl border border-border/50">
              <span className="text-3xl font-black tabular-nums tracking-tight">{match.homeScore}</span>
              <span className="text-muted-foreground/50 font-light text-2xl">:</span>
              <span className="text-3xl font-black tabular-nums tracking-tight">{match.awayScore}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="px-6 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-[0.2em]">
                Scheduled
              </div>
              {/* DISPLAY TIME FOR UPCOMING MATCHES */}
              {match.time && (
                <span className="flex items-center gap-1.5 text-xl font-bold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {formattedTime}
                </span>
              )}
            </div>
          )}

          {formattedDate && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {formattedDate}
            </span>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs uppercase tracking-widest text-foreground font-bold">
            {isPlayed ? (
              <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-0.5 rounded text-primary">
                <Clock className="w-3 h-3" /> {match.minutesPlayed}'
              </span>
            ) : (
              <span className="text-primary">Match Day {match.matchDay}</span>
            )}
            <span className="opacity-30">•</span>
            {/* ADDING TIME HERE AS WELL FOR PLAYED MATCHES IF DESIRED */}
            <span>{formattedTime ? `${formattedTime} • ` : ""}{match.league || "Seasonal League"}</span>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex flex-1 items-center justify-start gap-4 w-full md:w-auto">
          <Avatar className="w-12 h-12 rounded-xl border-2 border-background shadow-sm">
            <AvatarImage src={awayTeam?.logo || undefined} />
            <AvatarFallback style={{ backgroundColor: awayTeam?.primaryColor }} className="text-white font-bold">
              {awayTeam?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className={cn("font-bold text-lg hidden md:block", !isPlayed && "text-foreground")}>
            {awayTeam?.name}
          </span>
        </div>
      </div>

      {/* Discipline Footer (Hidden for Upcoming) */}
      {isPlayed && (match.homeYellows > 0 || match.awayYellows > 0 || match.homeReds > 0 || match.awayReds > 0) && (
        <div className="mt-5 pt-4 border-t border-border/40 flex justify-center items-center gap-6">
          <div className="flex gap-1">
            {Array.from({ length: match.homeYellows }).map((_, i) => <div key={i} className="w-1.5 h-2.5 bg-yellow-400 rounded-sm" />)}
            {Array.from({ length: match.homeReds }).map((_, i) => <div key={i} className="w-1.5 h-2.5 bg-red-500 rounded-sm" />)}
          </div>
          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter opacity-50">Match Events</span>
          <div className="flex gap-1">
            {Array.from({ length: match.awayYellows }).map((_, i) => <div key={i} className="w-1.5 h-2.5 bg-yellow-400 rounded-sm" />)}
            {Array.from({ length: match.awayReds }).map((_, i) => <div key={i} className="w-1.5 h-2.5 bg-red-500 rounded-sm" />)}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(match)}>
          View Details
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this match?"
        description={
          <>
            Match Day {match.matchDay} —{" "}
            <span className="font-semibold text-foreground">
              {homeTeam?.name ?? "Home"}
            </span>{" "}
            vs{" "}
            <span className="font-semibold text-foreground">
              {awayTeam?.name ?? "Away"}
            </span>{" "}
            will be permanently deleted along with all goals, assists,
            and cards recorded for this match.
          </>
        }
        confirmLabel="Delete Match"
        onConfirm={() => {
          onDelete(match.id);
          setDeleteOpen(false);
        }}
      />
    </motion.div>
  );
}