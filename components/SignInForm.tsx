'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/hooks/useAuth";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useDispatch } from "react-redux";
import { setAuth } from "@/lib/redux/slices/authSlice";
import { setLeague } from "@/lib/redux/slices/leagueSlice";

function getFirebaseErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-not-found': 'User not found',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password',
  };
  return errorMessages[code] || 'An error occurred. Please try again.';
}

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const dispatch = useDispatch();

  const validateForm = (): boolean => {
    if (!email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return false;
    }
    if (!password.trim()) {
      toast({ title: "Error", description: "Password is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { user, error } = await signIn(email, password);

      if (error) {
        const errorMessage = getFirebaseErrorMessage(error.code);
        toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
        return;
      }

      if (user) {
          // 2. Fetch the User Document from Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);

          if (!userSnap.exists()) {
            // Fallback: Auth exists but no profile? Send to onboarding
            router.push("/onboarding");
            return;
          }

          const userData = userSnap.data();
          
          // 3. Dispatch to Redux
          // This saves the leagueId and role globally
          dispatch(setAuth({
            uid: user.uid,
            email: user.email,
            displayName: userData.displayName,
            leagueId: userData.leagueId,
            photoUrl: userData.photoUrl
          }));

          toast({ title: "Welcome back!", description: `Logged in as ${userData.displayName}` });

          // 4. Smart Redirect Logic
          if (!userData.leagueId) {
            router.push("/onboarding");
          } else {
            // We fetch the slug once to build the pretty URL
            const leagueSnap = await getDoc(doc(db, "leagues", userData.leagueId));
            if (leagueSnap.exists()) {
              const lData = leagueSnap.data();
              
              dispatch(setLeague({
                id: leagueSnap.id,
                leagueName: lData.leagueName,
                slug: lData.slug,
                logoUrl: lData.logoUrl,
                ownerId: lData.ownerId,
                adminIds: lData.adminIds || [],
                theme: lData.theme,
                settings: lData.settings,
                subscription: lData.subscription,
                // Convert Firestore Timestamp to a serializable string
                createdAt: lData.createdAt?.toDate().toISOString() || null 
              }));

              router.push(`/${lData.slug}/dashboard`);
            }
          }
        }
      } catch (err) {
        console.error("SignIn Error:", err);
        toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-secondary border-border"
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-secondary border-border"
        minLength={6}
        required
      />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
      {onSwitchToSignUp && (
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary hover:underline font-medium"
          >
            Sign Up
          </button>
        </p>
      )}
    </form>
  );
}
