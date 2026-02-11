'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { SignInForm } from "@/components/SignInForm";
import { SignUpForm } from "@/components/SignUpForm";

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('inviteCode');

  // If invite code is in URL, switch to signup automatically
  useEffect(() => {
    if (inviteCode) {
      setIsLogin(false);
    }
  }, [inviteCode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-wider">KICKOFF</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Team Manager</p>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-center mb-6">
          {isLogin ? "Sign In" : "Create Account"}
        </h2>

        {isLogin ? (
          <SignInForm onSwitchToSignUp={() => setIsLogin(false)} />
        ) : (
          <SignUpForm onSwitchToLogin={() => setIsLogin(true)} initialInviteCode={inviteCode || undefined} />
        )}
      </motion.div>
    </div>
  );
}

export default function Auth() {
  return (
    <Suspense fallback={<div />}>
      <AuthContent />
    </Suspense>
  );
}
