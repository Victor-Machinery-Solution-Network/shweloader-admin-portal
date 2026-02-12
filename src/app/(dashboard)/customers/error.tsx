"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-destructive/10 mb-4 rounded-full p-3">
        <AlertCircle className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Something went wrong</h3>
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">
        {error.message || "Failed to load customers. Please try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
