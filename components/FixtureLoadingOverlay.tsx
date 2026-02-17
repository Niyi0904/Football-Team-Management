"use client"

import { motion } from "framer-motion"
import { Trophy, Zap } from "lucide-react"

export function FixtureLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl">
      {/* Background Glows to mimic stadium lights */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Icon Container */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="p-1 rounded-full border-t-2 border-r-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
          >
             <div className="bg-background rounded-full p-6">
                <Trophy className="h-16 w-16 text-primary" />
             </div>
          </motion.div>
          {/* Neon Pulse Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 scale-125 animate-ping" />
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Generating Fixtures
            </h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.3em]">
            Organizing the Season
          </p>
        </div>

        {/* Loading Progress Bar Mockup */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  )
}