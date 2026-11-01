import { Clock, History, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChayan } from "@/lib/chayan-context";
import type { SelectionRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface HistoryDrawerProps {
  listId: string;
  listName: string;
  selections: SelectionRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hides voiding and clearing, for visitors who don't own the list. */
  readOnly?: boolean;
}

export function HistoryDrawer({ listId, listName, selections, open, onOpenChange, readOnly = false }: HistoryDrawerProps) {
  const { clearSelections, deleteSelection } = useChayan();

  // Group selections by round, newest round first.
  const groupedByRound = selections.reduce<Record<number, SelectionRecord[]>>((acc, sel) => {
    acc[sel.round] = acc[sel.round] || [];
    acc[sel.round].push(sel);
    return acc;
  }, {});
  const roundNumbers = Object.keys(groupedByRound)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 border-l border-cyan-500/20 bg-[#0a0d14] shadow-[-10px_0_40px_rgba(0,0,0,0.8)] sm:max-w-md">
        <SheetHeader className="flex-row items-center gap-2 border-b border-slate-800 p-6 pb-4">
          <History className="size-5 text-cyan-400" />
          <div className="min-w-0">
            <SheetTitle className="text-lg font-bold tracking-wide text-white">Selection History</SheetTitle>
            <SheetDescription className="max-w-[220px] truncate font-mono text-xs">{listName}</SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {selections.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-slate-500">
              No picks recorded yet. Click SELECT to make your first pick!
            </div>
          ) : (
            roundNumbers.map((round) => (
              <section key={round} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="font-mono text-xs font-semibold tracking-widest text-cyan-400 uppercase">Round {round}</span>
                  <span className="font-mono text-[11px] text-slate-500">{groupedByRound[round].length} picks</span>
                </div>
                <div className="space-y-1.5">
                  {groupedByRound[round].map((sel) => (
                    <div
                      key={sel._id}
                      className="group/item flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 font-mono text-xs transition-colors hover:border-slate-700/80"
                    >
                      <div className="mr-2 flex min-w-0 items-center gap-2.5">
                        <span className="w-5 shrink-0 text-right text-slate-500">#{sel.selectionNumber}</span>
                        <span className="truncate font-sans text-sm font-medium text-white">{sel.itemValue}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="size-3 text-slate-600" />
                          {formatDate(sel.selectedAt)}
                        </span>
                        {!readOnly && <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Void pick ${sel.itemValue}`}
                                onClick={() => deleteSelection(sel._id)}
                                className="text-slate-500 opacity-0 group-hover/item:opacity-100 hover:text-rose-400 focus-visible:opacity-100"
                              />
                            }
                          >
                            <Trash2 />
                          </TooltipTrigger>
                          <TooltipContent>Void / skip this pick</TooltipContent>
                        </Tooltip>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-slate-800 p-6 pt-4">
          {selections.length > 0 && !readOnly ? (
            <ConfirmAction
              trigger={
                <Button variant="ghost" size="sm" className="font-mono text-xs text-rose-400/80 hover:text-rose-400">
                  <Trash2 />
                  Clear History
                </Button>
              }
              title="Clear selection history?"
              description="All picks for this list are removed. Current items are not affected."
              confirmLabel="Clear History"
              onConfirm={() => clearSelections(listId)}
            />
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
