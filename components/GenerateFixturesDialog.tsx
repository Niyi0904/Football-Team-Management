"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles } from "lucide-react"

export function GenerateFixturesDialog({ 
  open, 
  onOpenChange, 
  onConfirm 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  onConfirm: (weeks: number) => void 
}) {
  const [weeks, setWeeks] = useState(5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Auto-Generate Fixtures
          </DialogTitle>
          <DialogDescription>
            How many weeks of fixtures would you like to generate?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="weeks" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Number of Weeks
            </Label>
            <Input
              id="weeks"
              type="number"
              min={1}
              max={20}
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
              className="bg-secondary/20 border-border/50 focus:border-primary/50 text-lg font-bold"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              onConfirm(weeks);
              onOpenChange(false);
            }}
            className="shadow-lg shadow-primary/20"
          >
            Generate {weeks} Weeks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}