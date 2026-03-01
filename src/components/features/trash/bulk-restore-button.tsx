"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDataTable } from "@/components/ui/data-table";

interface BulkRestoreButtonProps<TData> {
  selectedRows: TData[];
  onRestore: (rows: TData[]) => Promise<{ success: boolean; error?: string }>;
}

export function BulkRestoreButton<TData>({
  selectedRows,
  onRestore,
}: BulkRestoreButtonProps<TData>) {
  const [isPending, startTransition] = useTransition();
  const { clearSelection } = useDataTable();

  const count = selectedRows.length;
  if (count === 0) return null;

  const plural = count === 1 ? "item" : "items";

  function handleRestore() {
    startTransition(async () => {
      const result = await onRestore(selectedRows);
      if (result.success) {
        toast.success(`${count} ${plural} restored`);
        clearSelection();
      } else {
        toast.error(result.error ?? "Failed to restore");
      }
    });
  }

  return (
    <Button
      size="sm"
      onClick={handleRestore}
      disabled={isPending}
      className="bg-green-600 text-white hover:bg-green-700"
    >
      <RotateCcw />
      Restore ({count})
    </Button>
  );
}
