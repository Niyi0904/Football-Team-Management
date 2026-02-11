'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user? Send to login
        router.push("/auth");
      } else {
        // User exists? Send to dashboard
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  // While checking auth or redirecting, show the loader
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground animate-pulse font-display text-xl">
        Loading...
      </div>
    </div>
  );
}