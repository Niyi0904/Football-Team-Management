'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/hooks/useAuth";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getInvite, markInviteAsUsed, setUserRole } from "@/lib/admin";

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

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const validateForm = (): boolean => {
    if (!email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email", variant: "destructive" });
      return false;
    }
    if (!displayName.trim()) {
      toast({ title: "Error", description: "Display name is required", variant: "destructive" });
      return false;
    }
    if (!password.trim()) {
      toast({ title: "Error", description: "Password is required", variant: "destructive" });
      return false;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return false;
    }
    if (!inviteCode.trim()) {
      toast({ title: "Error", description: "Invite code is required", variant: "destructive" });
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
      // Validate invite code (required)
      const inviteData = await getInvite(inviteCode);
      if (!inviteData) {
        toast({ title: "Error", description: "Invalid or expired invite code", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const roleFromInvite = inviteData.role as 'admin' | 'user';

      const { error, userId } = await signUp(email, password, displayName, file);
      if (error) {
        const errorCode = (error as any).code || 'unknown';
        const errorMessage = getFirebaseErrorMessage(errorCode);
        toast({ title: "Signup failed", description: errorMessage, variant: "destructive" });
      } else {
        // Mark invite as used and set the role
        if (userId) {
          await markInviteAsUsed(inviteCode, userId);
          await setUserRole(userId, roleFromInvite);
        }

        toast({ title: "Success", description: "Account created successfully" });
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setDisplayName("");
        setInviteCode("");
        setFile(null);
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
        placeholder="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="bg-secondary border-border"
        required
      />
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
      <Input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="bg-secondary border-border"
        minLength={6}
        required
      />
      <Input
        type="text"
        placeholder="Invite Code"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        className="bg-secondary border-border"
        required
      />
      <div>
        <label className="text-sm text-muted-foreground block mb-2">Profile Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Sign Up"}
      </Button>
      {onSwitchToLogin && (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary hover:underline font-medium"
          >
            Sign In
          </button>
        </p>
      )}
    </form>
  );
}
