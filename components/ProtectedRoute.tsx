'use client';

import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-4">
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
