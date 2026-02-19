'use client'

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, Zap, Trophy, Crown, Rocket, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Grassroots",
    price: "0",
    description: "Ideal for small community knockabouts.",
    features: ["Up to 3 Teams", "Round-Robin Scheduling", "Digital Standings", "Standard Support"],
    button: "Get Started",
    icon: <Zap className="w-6 h-6" />,
    popular: false,
    color: "text-blue-400"
  },
  {
    name: "Semi-Pro",
    price: "25,000",
    description: "Perfect for local amateur divisions.",
    features: ["Up to 6 Teams", "Automated Fixtures", "Basic Player Stats", "Standard UI Exports"],
    button: "Choose Semi-Pro",
    icon: <Rocket className="w-6 h-6" />,
    popular: false,
    color: "text-green-400"
  },
  {
    name: "League Master",
    price: "45,000",
    description: "The sweet spot for active tournaments.",
    features: ["Up to 20 Teams", "Discipline Tracking", "Golden Boot Race", "High-Res UI Exports", "Priority Support"],
    button: "Go Pro",
    icon: <Trophy className="w-6 h-6 text-primary" />,
    popular: true,
    color: "text-primary"
  },
  {
    name: "Elite",
    price: "85,000",
    description: "For professional academy networks.",
    features: ["Unlimited Teams", "Multi-Division Support", "Custom Branding", "Advanced Analytics", "White-label Reports"],
    button: "Go Elite",
    icon: <Crown className="w-6 h-6 text-yellow-500" />,
    popular: false,
    color: "text-yellow-500"
  }
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 pb-20">
      {/* HEADER */}
      <div className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        
        <Button 
          variant="ghost" 
          onClick={() => router.push('/')}
          className="absolute top-8 left-8 text-muted-foreground hover:text-white transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1 uppercase tracking-widest text-[10px] font-black">
            Pricing & Plans
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] mb-6">
            Pick your <span className="text-primary">League Level.</span>
          </h1>
          <p className="max-w-xl mx-auto text-muted-foreground text-lg">
            Fair pricing in ₦GN designed to scale with your tournament. No hidden fees.
          </p>
        </motion.div>
      </div>

      {/* PRICING GRID */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 ${
                plan.popular 
                ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10 scale-105 z-10' 
                : 'border-white/5 bg-[#0A0A0A] hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black text-[10px] font-black uppercase px-4 py-1 rounded-full whitespace-nowrap">
                  Recommended for Leagues
                </div>
              )}

              <div className="mb-6">
                <div className="p-3 w-fit rounded-xl bg-white/5 mb-4">
                  {plan.icon}
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black italic tracking-tighter">₦{plan.price}</span>
                <span className="text-muted-foreground text-[10px] uppercase font-bold">/ Month</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground leading-tight">
                    <Check className={`w-4 h-4 shrink-0 ${plan.color}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => router.push('/auth')}
                variant={plan.popular ? "default" : "outline"} 
                className={`w-full h-12 rounded-xl font-bold uppercase italic transition-all ${
                  plan.popular ? 'shadow-lg shadow-primary/20' : 'border-white/10 hover:bg-white/5'
                }`}
              >
                {plan.button}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* TRUST FOOTER */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/5 pt-16 text-center md:text-left">
            <div className="space-y-3">
                <ShieldCheck className="w-8 h-8 text-primary mx-auto md:mx-0" />
                <h4 className="font-bold uppercase italic">Secure Payments</h4>
                <p className="text-sm text-muted-foreground">Processed via Paystack. Your financial data is never stored on our servers.</p>
            </div>
            <div className="space-y-3">
                <Trophy className="w-8 h-8 text-primary mx-auto md:mx-0" />
                <h4 className="font-bold uppercase italic">Instant Activation</h4>
                <p className="text-sm text-muted-foreground">League tools are unlocked immediately after your payment is confirmed.</p>
            </div>
            <div className="space-y-3">
                <Zap className="w-8 h-8 text-primary mx-auto md:mx-0" />
                <h4 className="font-bold uppercase italic">No Hidden Costs</h4>
                <p className="text-sm text-muted-foreground">One price per season. No per-player or per-match extra charges.</p>
            </div>
        </div>
      </div>
    </div>
  );
}