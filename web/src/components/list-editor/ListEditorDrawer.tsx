import React, { useState } from "react";
import { AlertCircle, Check, ClipboardPaste, Edit2, Plus, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChayan } from "@/lib/chayan-context";
import type { ListItem } from "@/lib/types";

interface ListEditorDrawerProps {
  listId: string;
  items: ListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function IconAction({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} className={className} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ListEditorDrawer({ listId, items, open, onOpenChange }: ListEditorDrawerProps) {
  const { addItem, addItemsBulk, updateItem, deleteItem, clearItems } = useChayan();

  const [newItemValue, setNewItemValue] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValue.trim()) return;
    try {
      setIsSubmitting(true);
      await addItem(listId, newItemValue.trim());
      setNewItemValue("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    try {
      setIsSubmitting(true);
      const lines = bulkText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await addItemsBulk(listId, lines);
      setBulkText("");
      setShowBulkPaste(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (item: ListItem) => {
    setEditingItemId(item._id);
    setEditingText(item.value);
  };

  const saveEdit = async (itemId: string) => {
    if (!editingText.trim()) return;
    await updateItem(itemId, editingText.trim());
    setEditingItemId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 border-l border-cyan-500/20 bg-[#0a0d14] shadow-[-10px_0_40px_rgba(0,0,0,0.8)] sm:max-w-md">
        <SheetHeader className="border-b border-slate-800 p-6 pb-4">
          <SheetTitle className="text-lg font-bold tracking-wide text-white">Manage List Items</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {items.length} {items.length === 1 ? "entry" : "entries"} total
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <form onSubmit={handleAddSingle} className="flex gap-2">
            <Input
              placeholder="Add item..."
              aria-label="New item"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              className="h-10 flex-1 rounded-xl"
            />
            <Button type="submit" size="icon-lg" aria-label="Add item" disabled={!newItemValue.trim() || isSubmitting} className="size-10 rounded-xl">
              <Plus />
            </Button>
          </form>

          <div>
            <Button variant="link" size="sm" onClick={() => setShowBulkPaste(!showBulkPaste)} className="h-auto px-0 font-mono text-xs">
              <ClipboardPaste />
              {showBulkPaste ? "Hide Bulk Paste" : "Paste Multiple Items"}
            </Button>

            {showBulkPaste && (
              <div className="mt-2.5 space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <Textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"Paste lines here...\nAlice\nBob\nCharlie"}
                  aria-label="Items, one per line"
                  className="font-mono text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowBulkPaste(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleBulkAdd} disabled={!bulkText.trim() || isSubmitting}>
                    Add All Lines
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Alert className="border-slate-800/80 bg-slate-900/60 py-2.5">
            <AlertCircle className="text-cyan-400" />
            <AlertDescription className="font-mono text-[11px]">
              Duplicate values are permitted and treated as distinct entries.
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            {items.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500">No items added yet.</div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item._id}
                  className="group flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-2.5 text-sm transition-all hover:border-cyan-500/30 hover:bg-slate-900/80"
                >
                  <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] text-slate-500">{index + 1}.</span>
                    {editingItemId === item._id ? (
                      <div className="flex flex-1 items-center gap-1.5">
                        <Input
                          autoFocus
                          aria-label="Item value"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(item._id);
                            if (e.key === "Escape") setEditingItemId(null);
                          }}
                          className="h-7 flex-1 border-cyan-400 text-xs"
                        />
                        <IconAction label="Save item" onClick={() => saveEdit(item._id)} className="text-emerald-400 hover:text-emerald-300">
                          <Check />
                        </IconAction>
                      </div>
                    ) : (
                      <span className="truncate font-medium text-slate-200">{item.value}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                    <IconAction label="Edit item" onClick={() => startEdit(item)} className="text-slate-400 hover:text-cyan-300">
                      <Edit2 />
                    </IconAction>
                    <IconAction label="Delete item" onClick={() => deleteItem(item._id)} className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-400">
                      <Trash2 />
                    </IconAction>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-slate-800 p-6 pt-4">
          {items.length > 0 ? (
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="sm" className="font-mono text-xs text-rose-400/80 hover:text-rose-400">
                  Clear all items
                </Button>
              }
              title="Remove all items?"
              description="Every item in this list is deleted. Selection history is kept."
              confirmLabel="Remove All"
              onConfirm={() => clearItems(listId)}
            />
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
