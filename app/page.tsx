'use client'

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  ChevronRight, 
  Share2, 
  Cpu,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 overflow-x-hidden">
      {/* BACKGROUND DECOR */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />

      {/* NAVBAR */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase">Kickoff</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/pricing')} 
            className="hidden md:flex text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white"
          >
            Pricing
          </Button>
          <Button variant="ghost" onClick={() => router.push('/auth')} className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white">
            Login
          </Button>
          <Button onClick={() => router.push('/onboarding')} className="bg-white text-black hover:bg-white/90 font-bold px-6 rounded-full">
            Register League
          </Button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
            Now Powering Active Leagues
          </Badge>
          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
            Manage your league <br />
            <span className="text-primary tracking-normal not-italic font-display">like a Pro.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed">
            The all-in-one SaaS platform for tournament organizers. Automate fixtures, track discipline, and share high-fidelity reports with elite-level precision.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => router.push('/onboarding')} size="lg" className="h-14 px-8 text-lg font-bold gap-2 rounded-2xl w-full sm:w-auto shadow-xl shadow-primary/20">
              Launch Your League <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-bold rounded-2xl w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10">
              View Demo
            </Button>
          </div>
        </motion.div>

        {/* DASHBOARD PREVIEW MOCKUP */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative rounded-[2rem] border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl">
             <img 
               src="/assets/dashboard-preview.png" // You'll use your screenshot here
               alt="Kickoff Dashboard Preview"
               className="w-full h-auto opacity-90"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60" />
          </div>
        </motion.div>
      </section>

      {/* ALGORITHMS & LOGIC SECTION */}
      <section className="py-32 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl font-black uppercase italic mb-6 leading-tight">
                Engineered for <br /><span className="text-primary">Total Fairness.</span>
              </h2>
              <p className="text-muted-foreground mb-10 text-lg">
                We don't just store data; we calculate the game. KICKOFF uses industry-standard algorithms to handle the heavy lifting of tournament logistics.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Cpu className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">Round-Robin Scheduling</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">Our engine ensures every team plays a unique opponent per match week, eliminating scheduling conflicts automatically.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Zap className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">Fisher-Yates Randomization</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">Timeslots and dates are shuffled using true randomness, preventing any home-field bias in your fixtures.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-8 rounded-[2rem] bg-card border border-white/5 flex flex-col items-center text-center gap-4">
                 <BarChart3 className="w-10 h-10 text-primary" />
                 <h5 className="font-bold uppercase tracking-tighter">Live Standings</h5>
              </div>
              <div className="p-8 rounded-[2rem] bg-card border border-white/5 mt-8 flex flex-col items-center text-center gap-4">
                 <ShieldCheck className="w-10 h-10 text-primary" />
                 <h5 className="font-bold uppercase tracking-tighter">Discipline Tracking</h5>
              </div>
              <div className="p-8 rounded-[2rem] bg-card border border-white/5 flex flex-col items-center text-center gap-4">
                 <Share2 className="w-10 h-10 text-primary" />
                 <h5 className="font-bold uppercase tracking-tighter">Instant Exports</h5>
              </div>
              <div className="p-8 rounded-[2rem] bg-card border border-white/5 mt-8 flex flex-col items-center text-center gap-4">
                 <Trophy className="w-10 h-10 text-primary" />
                 <h5 className="font-bold uppercase tracking-tighter">SaaS Management</h5>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            {/* LEFT SIDE: THE TECH EXPLANATION */}
            <div className="flex-1 space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Backend Intelligence
              </Badge>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.9]">
                Smart Scheduling <br /> 
                <span className="text-muted-foreground">Zero Conflicts.</span>
              </h2>
              
              <div className="space-y-6 text-muted-foreground text-lg">
                <p>
                  Traditional spreadsheets fail when leagues grow. KICKOFF utilizes a 
                  <span className="text-white font-bold"> Circle Method Round-Robin algorithm </span> 
                  to mathematically pair teams.
                </p>
                
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    <span>Ensures every team plays every opponent exactly once.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    <span>Balances home/away distribution across the season.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    <span>Automated time-slot allocation via Fisher-Yates shuffle.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT SIDE: THE VISUAL PROOF (IMAGE 8) */}
            <div className="flex-1 relative">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-30 rounded-full" />
              
              {/* ADD YOUR IMAGE 8 HERE */}
              <div className="relative rounded-3xl border border-white/10 bg-[#0A0A0A] p-2 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <img 
                  src="/assets/match-records-preview.png" // USE IMAGE 8 (image_f2e8cb.png)
                  alt="Algorithm Generated Fixtures" 
                  className="w-full h-auto rounded-2xl grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                />

                {/* OVERLAY TAG */}
                <div className="absolute bottom-6 right-6 z-20">
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      Algorithm Validated
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
              Trusted by <span className="text-primary">40+ Players</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From local amateur divisions to professional academy tournaments, KICKOFF is the engine behind the game.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* TESTIMONIAL 1 */}
            <div className="p-8 rounded-[2rem] bg-card border border-white/5 relative group hover:border-primary/20 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Trophy key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-lg italic mb-6 leading-relaxed text-muted-foreground">
                "The Round-Robin generator saved me hours of manual work. I used to dread scheduling, now it's done in one click."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">KL</div>
                <div>
                  <h4 className="font-bold text-sm">Kingsley L.</h4>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Elite Sunday League</p>
                </div>
              </div>
            </div>

            {/* TESTIMONIAL 2 */}
            <div className="p-8 rounded-[2rem] bg-card border border-white/5 relative group hover:border-primary/20 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Trophy key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-lg italic mb-6 leading-relaxed text-muted-foreground">
                "The high-res UI downloads look amazing on our Instagram. Our players feel like they're in the Premier League."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">NO</div>
                <div>
                  <h4 className="font-bold text-sm">Niyi O.</h4>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Coastal Futsal Cup</p>
                </div>
              </div>
            </div>

            {/* TESTIMONIAL 3 */}
            <div className="p-8 rounded-[2rem] bg-card border border-white/5 relative group hover:border-primary/20 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Trophy key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-lg italic mb-6 leading-relaxed text-muted-foreground">
                "Managing 20 teams was a nightmare until I found KICKOFF. The dashboard gives me a bird's-eye view of everything."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">IO</div>
                <div>
                  <h4 className="font-bold text-sm">Israel O.</h4>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">City Amateur Division</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.8]">
              Ready to dominate <br />
              <span className="text-primary">your next season?</span>
            </h2>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
              Join the 40+ managers who have traded spreadsheets for professional-grade automation. Start your league in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                onClick={() => router.push('/onboarding')} 
                size="lg" 
                className="h-16 px-10 text-xl font-black uppercase italic gap-3 rounded-2xl w-full sm:w-auto shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
              >
                Create Your League Now
                <ArrowRight className="w-6 h-6" />
              </Button>

              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => router.push('/pricing')}
                className="h-16 px-10 text-lg font-bold rounded-2xl w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10"
              >
                View Plans
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="h-16 px-10 text-lg font-bold rounded-2xl w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10"
              >
                Back to Top
              </Button>
            </div>

            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground pt-8">
              No Credit Card Required • Instant Setup • SaaS Powered
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-6 text-center border-t border-white/5">
        <p className="text-muted-foreground text-sm uppercase tracking-[0.5em] font-bold">
          Kickoff Team Manager &copy; 2026
        </p>
      </footer>
    </div>
  );
}