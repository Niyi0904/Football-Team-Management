'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/hooks/useAuth";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";

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
      const { error } = await signIn(email, password);
      if (error) {
        const errorCode = (error as any).code || 'unknown';
        const errorMessage = getFirebaseErrorMessage(errorCode);
        toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Logged in successfully" });
        setEmail("");
        setPassword("");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
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
