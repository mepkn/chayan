import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { ModePicker } from "@/components/lists/ModePicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useChayan } from "@/lib/chayan-context";
import type { SelectionMode } from "@/lib/types";

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateListModal({ open, onOpenChange }: CreateListModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cyber-glass-glow max-h-[90vh] overflow-y-auto rounded-3xl border-cyan-500/30 p-6 sm:max-w-xl sm:p-8">
        {/* Remount on open so the form starts empty each time. */}
        {open && <CreateListForm onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateListForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { createList } = useChayan();

  const [name, setName] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("no_repetition");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a list name.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const items = itemsText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { slug } = await createList({
        name: name.trim(),
        items,
        selectionMode,
      });

      onClose();
      navigate(`/lists/${slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader className="flex-row items-center gap-2.5 border-b border-slate-800/80 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
          <Sparkles className="size-4" />
        </div>
        <div>
          <DialogTitle className="text-xl font-bold tracking-wide text-white">Create New List</DialogTitle>
          <DialogDescription className="text-xs">Set up a new collection for random selection</DialogDescription>
        </div>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="border-rose-500/30 bg-rose-500/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="list-name" className="field-label">List Name *</FieldLabel>
          <Input
            id="list-name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Friday Meeting, Presentation Order, Game Night..."
            className="h-11 rounded-xl"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="list-items" className="field-label">Items (One per line)</FieldLabel>
          <Textarea
            id="list-items"
            rows={5}
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie\nDavid"}
            className="rounded-xl font-mono"
          />
          <FieldDescription>Optional, you can add items later.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel className="field-label">Selection Mode</FieldLabel>
          <ModePicker value={selectionMode} onChange={setSelectionMode} />
        </Field>
      </FieldGroup>

      <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl sm:-mx-8 sm:-mb-8 sm:px-8">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Create & Open List
        </Button>
      </DialogFooter>
    </form>
  );
}
