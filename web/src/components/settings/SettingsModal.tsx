import { useState } from "react";
import { Cpu, Dices, Flame, RotateCcw, Sliders, Trash2, Trophy, Volume2, VolumeX } from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ModePicker } from "@/components/lists/ModePicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChayan } from "@/lib/chayan-context";
import { sound } from "@/lib/sound";
import type { AnimationTheme, ListDoc, SelectionMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  list: ListDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = [
  { value: "cyber_hud", label: "Cyber", hint: "Default", icon: Cpu, color: "text-purple-400", active: "data-[pressed]:border-purple-400 data-[pressed]:bg-purple-500/15 data-[pressed]:text-purple-200 data-[pressed]:shadow-[0_0_15px_rgba(139,92,246,0.25)]" },
  { value: "gold_stadium", label: "Gold", hint: "Flares & Lights", icon: Trophy, color: "text-amber-400", active: "data-[pressed]:border-amber-400 data-[pressed]:bg-amber-500/15 data-[pressed]:text-amber-200 data-[pressed]:shadow-[0_0_15px_rgba(245,158,11,0.25)]" },
  { value: "crimson_arena", label: "Crimson", hint: "Steam & Siren", icon: Flame, color: "text-rose-400", active: "data-[pressed]:border-rose-400 data-[pressed]:bg-rose-500/15 data-[pressed]:text-rose-200 data-[pressed]:shadow-[0_0_15px_rgba(244,63,94,0.25)]" },
  { value: "random", label: "Random", hint: "Shuffle", icon: Dices, color: "text-cyan-400", active: "data-[pressed]:border-cyan-400 data-[pressed]:bg-cyan-500/15 data-[pressed]:text-cyan-200 data-[pressed]:shadow-[0_0_15px_rgba(0,240,255,0.25)]" },
] as const;

// Older lists may still store the legacy theme names.
function normalizeTheme(theme: AnimationTheme | undefined): AnimationTheme {
  if (theme === "fifa_walkout") return "gold_stadium";
  if (theme === "wwe_rumble") return "crimson_arena";
  return theme || "cyber_hud";
}

export function SettingsModal({ list, open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cyber-glass-glow flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-3xl border-cyan-500/30 p-0 sm:max-w-lg">
        {/* Remount on open so unsaved changes are dropped when reopened. */}
        {open && <SettingsForm list={list} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ list, onClose }: { list: ListDoc; onClose: () => void }) {
  const { updateList, clearSelections, startNewRound } = useChayan();

  const [mode, setMode] = useState<SelectionMode>(list.selectionMode);
  const [theme, setTheme] = useState<AnimationTheme>(normalizeTheme(list.animationTheme));
  const [duration, setDuration] = useState<number>(list.animationDuration || 2.5);
  const [reducedMotion, setReducedMotion] = useState<boolean>(list.reducedMotion || false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateList({
        listId: list._id,
        selectionMode: mode,
        animationDuration: duration,
        reducedMotion,
        animationTheme: theme,
      });
      sound.setMuted(isMuted);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    await clearSelections(list._id);
    flash("Selection history cleared.");
  };

  const handleStartNewRound = async () => {
    const res = await startNewRound(list._id);
    flash(`Round ${res.newRound} initiated! All items are eligible.`);
  };

  return (
    <>
      <DialogHeader className="shrink-0 flex-row items-center gap-2.5 border-b border-slate-800/80 bg-slate-950/40 px-6 py-5 sm:px-8">
        <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
          <Sliders className="size-4" />
        </div>
        <div>
          <DialogTitle className="text-xl font-bold tracking-wide text-white">List Settings</DialogTitle>
          <DialogDescription className="font-mono text-xs">{list.name}</DialogDescription>
        </div>
      </DialogHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
        {message && (
          <Alert className="border-cyan-500/30 bg-cyan-500/10">
            <AlertDescription className="font-mono text-xs text-cyan-300">{message}</AlertDescription>
          </Alert>
        )}

        <FieldSet>
          <FieldLegend className="field-label">Selection Behavior</FieldLegend>
          <ModePicker value={mode} onChange={setMode} orientation="vertical" />
        </FieldSet>

        <FieldSet className="border-t border-slate-800 pt-4">
          <FieldLegend className="field-label">Visual & Audio</FieldLegend>

          <Field>
            <FieldLabel className="text-xs text-slate-300">Animation Style</FieldLabel>
            <ToggleGroup
              aria-label="Animation style"
              value={[theme]}
              onValueChange={(next) => next[0] && setTheme(next[0] as AnimationTheme)}
              className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {THEMES.map((t) => (
                <ToggleGroupItem
                  key={t.value}
                  value={t.value}
                  variant="outline"
                  className={cn(
                    "h-auto w-full flex-col gap-1.5 rounded-xl border-slate-800 bg-slate-950/60 p-2.5 text-slate-400 hover:border-slate-700 hover:bg-slate-950/80",
                    t.active,
                  )}
                >
                  <t.icon className={cn("size-4", t.color)} />
                  <span className="font-mono text-[11px] font-bold">{t.label}</span>
                  <span className="text-[9px] font-normal text-slate-500">{t.hint}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field>
            <div className="flex items-center justify-between font-mono text-xs">
              <FieldLabel htmlFor="spin-duration" className="text-slate-300">Spin Duration</FieldLabel>
              <span className="font-bold text-cyan-300">{duration}s</span>
            </div>
            <Slider
              id="spin-duration"
              min={1}
              max={5}
              step={0.5}
              value={[duration]}
              onValueChange={(v) => setDuration(Array.isArray(v) ? v[0] : v)}
            />
          </Field>

          <Field orientation="horizontal" className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <FieldContent>
              <FieldLabel htmlFor="reduced-motion" className="text-sm text-slate-200">Reduced Motion</FieldLabel>
              <FieldDescription className="text-xs">Faster, simplified transition with minimal movement</FieldDescription>
            </FieldContent>
            <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
          </Field>

          <Field orientation="horizontal" className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            {isMuted ? <VolumeX className="size-4 shrink-0 text-slate-500" /> : <Volume2 className="size-4 shrink-0 text-cyan-400" />}
            <FieldContent>
              <FieldLabel htmlFor="sound-effects" className="text-sm text-slate-200">Sound Effects</FieldLabel>
              <FieldDescription className="text-xs">Futuristic ticker and celebration chimes</FieldDescription>
            </FieldContent>
            <Switch id="sound-effects" checked={!isMuted} onCheckedChange={(on) => setIsMuted(!on)} />
          </Field>
        </FieldSet>

        <FieldSet className="border-t border-slate-800 pt-4">
          <FieldLegend className="field-label">Rounds & History</FieldLegend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button variant="outline" onClick={handleStartNewRound} className="h-10 rounded-xl font-mono text-xs text-cyan-300 hover:border-cyan-500/40">
              <RotateCcw />
              Start New Round
            </Button>
            <ConfirmAction
              trigger={
                <Button variant="outline" className="h-10 rounded-xl font-mono text-xs text-rose-300 hover:border-rose-500/40">
                  <Trash2 />
                  Clear History
                </Button>
              }
              title="Clear selection history?"
              description="All picks for this list are removed. Your items and round status are kept."
              confirmLabel="Clear History"
              onConfirm={handleClearHistory}
            />
          </div>
        </FieldSet>
      </div>

      <DialogFooter className="m-0 shrink-0 rounded-b-3xl border-slate-800/80 bg-slate-950/60 px-6 py-4 sm:px-8">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Spinner />}
          Save Settings
        </Button>
      </DialogFooter>
    </>
  );
}
