"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl">😵‍💫</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error.message?.includes("fetch") ? "We couldn't reach the server. Check your connection." : "An unexpected error occurred. Please try again."}
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
