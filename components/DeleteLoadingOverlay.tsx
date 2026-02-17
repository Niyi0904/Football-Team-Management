"use client"

import { motion } from "framer-motion"
import { Trash2, AlertTriangle } from "lucide-react"

export function DeleteLoadingOverlay({ message = "Clearing Fixtures" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
      {/* Red Background Glows for warning aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-destructive/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-900/20 rounded-full blur-[120px] animate-pulse" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Icon Container */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="p-1 rounded-full border-2 border-destructive/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          >
             <div className="bg-background rounded-full p-6">
                <Trash2 className="h-16 w-16 text-destructive" />
             </div>
          </motion.div>
          {/* Neon Warning Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-destructive/30 scale-150 animate-ping" />
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive fill-destructive/20" />
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {message}
            </h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.3em]">
            Updating Database
          </p>
        </div>

        {/* Destructive Progress Bar */}
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-destructive"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  )
}