'use client'

import React, { useState, useRef } from "react";
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { 
  Trophy, ArrowRight, ArrowLeft, Camera, 
  Loader2, Image as ImageIcon, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadProfileImage } from "@/lib/uploadImage";
import { backfillLeagueData } from "@/lib/migrate";
import { setUserRole } from "@/lib/admin";

// Helper for unique slugs
const generateUniqueSlug = async (name: string) => {
  let slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
  let finalSlug = slug;
  let count = 1;
  while (true) {
    const docSnap = await getDoc(doc(db, "leagues", finalSlug));
    if (!docSnap.exists()) break;
    finalSlug = `${slug}-${count}`;
    count++;
  }
  return finalSlug;
};

const onboardingSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  leagueName: z.string().min(3, "League name must be at least 3 characters"),
  expectedTeams: z.string(),
  pointsForWin: z.number().min(1),
    theme: z.object({ primary: z.string(), secondary: z.string() })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
});


export default function OnboardingPage() {
  const router = useRouter();
  const { signUp } = useAuth(); // Assuming uploadProfileImage is exposed
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [lastAttemptedEmail, setLastAttemptedEmail] = useState<string>("");
  
  // File States
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [leagueLogo, setLeagueLogo] = useState<File | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    validators: {
      onChange: onboardingSchema,
    },
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      leagueName: "",
      expectedTeams: "3",
      pointsForWin: 3,
      theme: {
        primary: "#10b981",
        secondary: "#064e3b"
      }
    },
    onSubmit: async ({ value }) => {
      setIsProcessing(true);
      try {
        if (!userId) throw new Error("Auth session missing.");

        // 1. Upload League Logo if exists
        let finalLogoUrl = "";
        if (leagueLogo) {
          const uploadRes = await uploadProfileImage(leagueLogo); // Reusing your upload logic
          finalLogoUrl = uploadRes?.data?.url ?? "";
        }

        // 2. Generate Unique Slug
        const uniqueSlug = await generateUniqueSlug(value.leagueName);
        const newLeagueRef = doc(collection(db, "leagues")); 
        const leagueId = newLeagueRef.id; // Get the generated ID (e.g., "7kJ92b...")
        
        // 3. Construct Payload
        const leaguePayload = {
          id: leagueId, // Essential for your SaaS structure
          leagueName: value.leagueName,
          slug: uniqueSlug,
          ownerId: userId,
          adminIds: [userId],
          logoUrl: finalLogoUrl,
          theme: { primary: value.theme.primary, secondary: value.theme.secondary },
          settings: {
            pointsForWin: value.pointsForWin,
            maxTeams: 3,
          },
          subscription: {
            plan: "grassroots",
            active: true
          },
          createdAt: serverTimestamp()
        };
        await setUserRole(userId, "admin");
        await setDoc(newLeagueRef, leaguePayload);

        await backfillLeagueData(leagueId);
        router.push(`/${uniqueSlug}/dashboard`);
      } catch (err) {
        console.error("League creation failed:", err);
      } finally {
        setIsProcessing(false);
      }
    },
  });

  // Step 1 -> 2: Signup
  const handleAuthStep = async () => {
    const values = form.state.values;

    if (values.password !== values.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (userId && values.email === lastAttemptedEmail) {
        console.log("User already authenticated with this email, moving to Step 2.");
        setStep(2);
        return;
    }

    if (userId && values.email !== lastAttemptedEmail) {
        setUserId(null); 
    }

    setIsProcessing(true);
    const { error, userId: newId } = await signUp(
      values.email, 
      values.password, 
      values.displayName, 
      profileImage 
    );

    if (error) {
        // Specific check for "email-already-in-use"
        if (error.code === 'auth/email-already-in-use') {
            alert("This email is already registered. Please sign in or use a different email.");
        } else {
            alert(error.message);
        }
        setIsProcessing(false);
    } else {
        // 5. SUCCESS: Store the ID and the email used
        setUserId(newId);
        setLastAttemptedEmail(values.email); // Record the successful email
        setIsProcessing(false);
        setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 selection:bg-primary/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Progress Tracker */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
        
        {/* STEP 1: USER REGISTRATION */}
        {step === 1 && (
            <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-primary leading-none">The Manager</h1>
                <p className="text-muted-foreground text-sm">Create your admin profile to begin.</p>
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
                <Input type="file" ref={profileInputRef} accept="image/*" className="hidden" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} />
                <div 
                    className="relative group cursor-pointer"
                    onClick={() => profileInputRef.current?.click()}
                >
                    <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                        {profileImage ? (
                        <img src={URL.createObjectURL(profileImage)} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                        <Camera className="text-muted-foreground w-6 h-6 group-hover:text-primary" />
                        )}
                    </div>
                </div>
                <Label className="text-[9px] uppercase font-black tracking-widest opacity-50">Admin Photo</Label>
            </div>
            

            <div className="space-y-4">
                <form.Field name="displayName" children={(field) => (
                <Input placeholder="Full Name" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl" />
                )} />
                <form.Field name="email" children={(field) => (
                <Input placeholder="Email Address" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl" />
                )} />
                <div className="grid grid-cols-2 gap-4">
                <form.Field name="password" children={(field) => (
                    <Input type="password" placeholder="Password" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl" />
                )} />
                <form.Field name="confirmPassword" children={(field) => (
                    <Input type="password" placeholder="Confirm" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl" />
                )} />
                </div>
            </div>

            <Button type="button" disabled={isProcessing} onClick={handleAuthStep} className="w-full h-14 rounded-xl font-bold uppercase italic shadow-xl shadow-primary/20">
                {isProcessing ? <Loader2 className="animate-spin" /> : "Next: League Identity"}
            </Button>
            </div>
        )}

        {/* STEP 2: LEAGUE IDENTITY & LOGO */}
        {step === 2 && (
            <div className="space-y-8">
                <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">League Brand</h1>
                <p className="text-muted-foreground text-sm">Every great league starts with a great badge.</p>
                </div>

                {/* LEAGUE LOGO UPLOAD */}
                <div className="flex flex-col items-center gap-4">
                <div 
                    className="relative group w-full cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => logoInputRef.current?.click()}
                >
                    <div className="w-full h-40 rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
                    {leagueLogo ? (
                        <img 
                        src={URL.createObjectURL(leagueLogo)} 
                        className="w-full h-full object-contain p-4" 
                        alt="League Logo" 
                        />
                    ) : (
                        <>
                        <ImageIcon className="text-muted-foreground w-10 h-10 mb-2 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Upload League Logo</span>
                        </>
                    )}
                    </div>
                    <input 
                    type="file" 
                    ref={logoInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => setLeagueLogo(e.target.files?.[0] || null)} 
                    />
                </div>
                </div>

                {/* LEAGUE NAME & LIVE SLUG */}
                <form.Field name="leagueName">
                {(field) => (
                    <div className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                        <Label className="text-[10px] uppercase tracking-widest font-black text-primary">League Name</Label>
                        {/* LIVE SLUG PREVIEW */}
                        <span className="text-[9px] font-mono text-muted-foreground opacity-60">
                        kickoff.com/<span className="text-primary">
                            {field.state.value 
                            ? field.state.value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') 
                            : "your-slug"}
                        </span>
                        </span>
                    </div>
                    
                    <Input 
                        value={field.state.value} 
                        onChange={(e) => field.handleChange(e.target.value)} 
                        placeholder="e.g. Lagos Amateur Premier League" 
                        className="h-14 bg-white/5 border-white/10 rounded-xl text-lg font-bold focus:border-primary transition-all" 
                    />
                    
                    {field.state.meta.errors.length > 0 && (
                        <p className="text-[10px] font-bold text-red-500 uppercase italic px-1">
                            {field.state.meta.errors.map(err => typeof err === 'object' ? err.message : err).join(', ')}
                        </p>
                        )}
                    </div>
                )}
                </form.Field>

                {/* NAVIGATION */}
                <div className="flex gap-4 pt-2">
                <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="h-14 px-6 rounded-xl border-white/10 hover:bg-white/5"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button 
                    type="button" 
                    onClick={() => setStep(3)} 
                    className="flex-1 h-14 rounded-xl font-bold uppercase italic shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
                >
                    Finalize Rules <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                </div>
            </div>
        )}

        {/* STEP 3: LOGISTICS & LAUNCH */}
        {step === 3 && (
            <div className="space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-primary leading-none">Final Config</h1>
                    <p className="text-muted-foreground text-sm">Set your match engine and brand colors.</p>
                </div>

                <div className="space-y-6">
                {/* BRAND COLORS */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest font-black opacity-50 block text-center">Primary</Label>
                    <div className="flex justify-center">
                        <form.Field
                        name="theme.primary"
                        children={(field) => (
                            <input 
                            type="color" 
                            value={field.state.value} 
                            onChange={(e) => field.handleChange(e.target.value)} 
                            className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent overflow-hidden" 
                            />
                        )}
                        />
                    </div>
                    </div>
                    <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest font-black opacity-50 block text-center">Secondary</Label>
                    <div className="flex justify-center">
                        <form.Field
                        name="theme.secondary"
                        children={(field) => (
                            <input 
                            type="color" 
                            value={field.state.value} 
                            onChange={(e) => field.handleChange(e.target.value)} 
                            className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent overflow-hidden" 
                            />
                        )}
                        />
                    </div>
                    </div>
                </div>

                {/* MATCH RULES */}
                <form.Field name="pointsForWin" children={(field) => (
                    <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Points per Victory</Label>
                    <Input 
                        type="number" 
                        value={field.state.value} 
                        onChange={(e) => field.handleChange(Number(e.target.value))} 
                        className="bg-white/5 border-white/10 h-14 text-xl font-bold rounded-xl focus:border-primary transition-all" 
                    />
                    </div>
                )} />

                {/* AUTO-SET INFO CARD */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black">3</div>
                    <div className="text-[10px] uppercase leading-tight font-bold text-muted-foreground">
                    Your league is starting on the <span className="text-primary italic">Grassroots Plan</span>. 
                    <br />Max capacity: <span className="text-white">3 Teams</span>.
                    </div>
                </div>
                </div>

                {/* NAVIGATION */}
                <div className="flex gap-4 pt-4">
                <Button variant="ghost" type="button" onClick={() => setStep(2)} className="h-16 px-6 rounded-xl border-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="flex-1 h-16 rounded-xl font-black uppercase italic text-lg shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    {isProcessing ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" /> <span>Deploying...</span>
                    </div>
                    ) : (
                    "Kickoff Season"
                    )}
                </Button>
                </div>
            </div>
        )}
        </form>
      </div>
    </div>
  );
}