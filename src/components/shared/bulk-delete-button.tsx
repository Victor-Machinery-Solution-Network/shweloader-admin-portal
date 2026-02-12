'use client';

import { useState, useEffect, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/shared/delete-dialog';
import { useDataTable } from '@/components/ui/data-table';

interface BulkDeleteButtonProps<TData> {
  selectedRows: TData[];
  onDelete: (rows: TData[]) => Promise<{ success: boolean; error?: string }>;
  /** Async function to build a custom description (e.g. with linked item counts) */
  buildDescription?: (rows: TData[]) => Promise<string>;
  /** Label for the item type, e.g. "category" or "sub category" */
  itemLabel?: string;
}

export function BulkDeleteButton<TData>({
  selectedRows,
  onDelete,
  buildDescription,
  itemLabel = 'item',
}: BulkDeleteButtonProps<TData>) {
  const [showDialog, setShowDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState('');
  const { clearSelection } = useDataTable();

  const count = selectedRows.length;
  const plural = count === 1 ? itemLabel : `${itemLabel}s`;

  useEffect(() => {
    if (count === 0) {
      setDescription('');
      return;
    }

    if (buildDescription) {
      buildDescription(selectedRows).then(setDescription);
    } else {
      setDescription(
        `This will permanently delete ${count} ${plural}. This action cannot be undone.`,
      );
    }
  }, [count, buildDescription, selectedRows, plural]);

  if (count === 0) return null;

  function handleConfirm() {
    startTransition(async () => {
      const result = await onDelete(selectedRows);
      if (result.success) {
        toast.success(`${count} ${plural} deleted`);
        setShowDialog(false);
        clearSelection();
      } else {
        toast.error(result.error ?? 'Failed to delete');
      }
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        <Trash2 />
        Delete ({count})
      </Button>

      <DeleteDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleConfirm}
        title={`Delete ${count} ${plural}?`}
        description={description || `Loading...`}
        isPending={isPending}
      />
    </>
  );
}
