import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ConvexError } from "convex/values";
import {
  ArrowLeft,
  Share2,
  Settings,
  ListPlus,
  History,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
  Edit3,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/navigation/Navbar";
import { HolographicSelector } from "@/components/selector/HolographicSelector";
import { GoldStadiumSelector } from "@/components/selector/GoldStadiumSelector";
import { CrimsonArenaSelector } from "@/components/selector/CrimsonArenaSelector";
import { WinnerModal } from "@/components/selector/WinnerModal";
import { ListEditorDrawer } from "@/components/list-editor/ListEditorDrawer";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { HistoryDrawer } from "@/components/history/HistoryDrawer";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ModeBadge } from "@/components/lists/ModeBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Spinner } from "@/components/ui/spinner";
import { usePicki } from "@/lib/picki-context";
import { toListDoc } from "@/lib/list-doc";
import type { ListItem, SelectionRecord, SelectionResult } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

export function ListPage() {
  const navigate = useNavigate();
  const params = useParams();
  const slug = params.slug ?? "";

  const {
    selectRandomItem,
    startNewRound,
    deleteSelection,
    deleteList,
    updateList,
  } = usePicki();

  // Live for everyone with the link; only the owner gets canEdit.
  const rawList = useQuery(api.lists.getListBySlug, { slug });
  const list = rawList ? toListDoc(rawList) : rawList;
  const canEdit = rawList?.canEdit ?? false;
  const listId = rawList?._id as Id<"lists"> | undefined;
  const rawItems = useQuery(api.items.getItems, listId ? { listId } : "skip");
  const rawSelections = useQuery(api.selections.getSelections, listId ? { listId } : "skip");
  const items: ListItem[] = React.useMemo(
    () => (rawItems ?? []).map((i) => ({ ...i, _id: i._id as string, listId: i.listId as string })),
    [rawItems]
  );
  const selections: SelectionRecord[] = React.useMemo(
    () =>
      (rawSelections ?? []).map((s) => ({
        ...s,
        _id: s._id as string,
        listId: s.listId as string,
        itemId: s.itemId as string | undefined,
      })),
    [rawSelections]
  );

  // Random aesthetic chosen when list has animationTheme 'random'
  const [randomTheme] = useState<"gold_stadium" | "crimson_arena" | "cyber_hud">(() => {
    const styles = ["cyber_hud", "gold_stadium", "crimson_arena"] as const;
    return styles[Math.floor(Math.random() * styles.length)];
  });

  const rawTheme = list?.animationTheme || "cyber_hud";
  const effectiveTheme: "gold_stadium" | "crimson_arena" | "cyber_hud" =
    rawTheme === "random"
      ? randomTheme
      : rawTheme === "fifa_walkout" || rawTheme === "gold_stadium"
      ? "gold_stadium"
      : rawTheme === "wwe_rumble" || rawTheme === "crimson_arena"
      ? "crimson_arena"
      : "cyber_hud";

  // Modal / Drawer UI states
  const [showEditor, setShowEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Title editing state & list deletion
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list?.name || "");
  const [isDeletingList, setIsDeletingList] = useState(false);


  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = titleInput.trim();
    if (!trimmed || !list) {
      setIsEditingTitle(false);
      setTitleInput(list?.name || "");
      return;
    }
    if (trimmed !== list.name) {
      await updateList({ listId: list._id, name: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handleDeleteList = async () => {
    if (!list) return;
    setIsDeletingList(true);
    try {
      await deleteList(list._id);
      navigate("/");
    } catch {
      setIsDeletingList(false);
    }
  };

  // Selection execution states
  const [isSelecting, setIsSelecting] = useState(false);
  const [authoritativeResult, setAuthoritativeResult] = useState<SelectionResult | null>(null);
  const authoritativeResultRef = React.useRef<SelectionResult | null>(null);
  const [winnerItem, setWinnerItem] = useState<ListItem | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoRestartNotice, setAutoRestartNotice] = useState<string | null>(null);

  // Calculate current round progress
  const currentRoundSelections = selections.filter(
    (s) => s.round === (list?.currentRound || 1)
  );
  const selectedCountThisRound = currentRoundSelections.length;
  const isRoundComplete =
    list?.selectionMode === "no_repetition" &&
    items.length > 0 &&
    selectedCountThisRound >= items.length;

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2505);
    }
  };

  // Authoritative selection trigger
  const handleSelect = async () => {
    if (!list || !canEdit) return;
    if (isSelecting) return; // Prevent double-clicks / rapid fires
    if (items.length === 0) {
      setShowEditor(true);
      return;
    }
    if (isRoundComplete) {
      return;
    }

    try {
      setIsSelecting(true);
      setErrorMessage(null);
      setAutoRestartNotice(null);
      authoritativeResultRef.current = null;
      setAuthoritativeResult(null);

      // Call authoritative backend mutation
      const result = await selectRandomItem(list._id);
      authoritativeResultRef.current = result;
      setAuthoritativeResult(result);

      if (result.autoRestarted) {
        setAutoRestartNotice(`Round ${result.round} initiated automatically!`);
        setTimeout(() => setAutoRestartNotice(null), 4000);
      }
    } catch (err: unknown) {
      setIsSelecting(false);
      // ConvexError carries the message meant for people (empty list, round complete).
      setErrorMessage(err instanceof ConvexError && typeof err.data === "string" ? err.data : "Selection failed");
    }
  };

  // When animation finishes decelerating on authoritative result
  const handleAnimationComplete = () => {
    const result = authoritativeResultRef.current || authoritativeResult;
    if (result) {
      const match = items.find((i) => i._id === result.selectedItem._id) || {
        _id: result.selectedItem._id,
        listId: list?._id || "",
        value: result.selectedItem.value,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setWinnerItem(match);
      setShowWinnerModal(true);
    }
    setIsSelecting(false);
  };

  // Skip selected candidate and pick next
  const handleSkip = async () => {
    const result = authoritativeResultRef.current || authoritativeResult;
    if (!result) return;
    const skippedName = winnerItem?.value || result.selectedItem.value;
    const selectionIdToVoid = result.selectionId;

    setShowWinnerModal(false);
    setWinnerItem(null);
    setAuthoritativeResult(null);
    authoritativeResultRef.current = null;

    try {
      // 1. Delete selection from backend so candidate is not marked as selected
      await deleteSelection(selectionIdToVoid);
      setAutoRestartNotice(`Skipped ${skippedName}. Picking next...`);
      setTimeout(() => setAutoRestartNotice(null), 3500);

      // 2. Automatically trigger select for next eligible person
      setTimeout(() => {
        handleSelect();
      }, 300);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to skip candidate");
    }
  };

  const handleSelectRef = React.useRef(handleSelect);
  useEffect(() => {
    handleSelectRef.current = handleSelect;
  });

  // Keyboard shortcut: Spacebar to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        canEdit &&
        !showEditor &&
        !showSettings &&
        !showHistory &&
        !showWinnerModal &&
        !isSelecting &&
        !isRoundComplete &&
        items.length > 0
      ) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          handleSelectRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, showEditor, showSettings, showHistory, showWinnerModal, isSelecting, isRoundComplete, items.length]);

  const selectedItem: ListItem | null = authoritativeResult
    ? items.find((i) => i._id === authoritativeResult.selectedItem._id) ?? {
        _id: authoritativeResult.selectedItem._id,
        listId: list?._id ?? "",
        value: authoritativeResult.selectedItem.value,
        createdAt: 0,
        updatedAt: 0,
      }
    : null;

  const Selector =
    effectiveTheme === "gold_stadium"
      ? GoldStadiumSelector
      : effectiveTheme === "crimson_arena"
      ? CrimsonArenaSelector
      : HolographicSelector;

  if (list === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 grid place-items-center">
          <Spinner className="size-6 text-cyan-400" />
        </main>
      </div>
    );
  }

  // Not Found State
  if (!list) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 flex flex-col items-center justify-center text-center py-20 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">List Not Found</h1>
            <p className="text-slate-400 text-sm">
              The list you are looking for does not exist or may have been deleted.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button render={<Link to="/" />} nativeButton={false}>
              Go to Homepage
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col justify-between">
        {/* Top Header Bar */}
        <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-slate-800/80 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Back & Title */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      render={<Link to="/" />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-lg"
                      aria-label="Back to home"
                      className="mt-0.5 shrink-0 rounded-xl text-slate-400 hover:border-cyan-500/40 hover:text-white sm:mt-0"
                    />
                  }
                >
                  <ArrowLeft />
                </TooltipTrigger>
                <TooltipContent>Back to home</TooltipContent>
              </Tooltip>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-nowrap group/title min-w-0">
                  {isEditingTitle ? (
                    <form onSubmit={handleSaveTitle} className="inline-flex items-center gap-2 min-w-0">
                      <Input
                        aria-label="List name"
                        autoFocus
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={() => handleSaveTitle()}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setIsEditingTitle(false);
                            setTitleInput(list.name);
                          }
                        }}
                        style={{ width: `${Math.max(titleInput.length + 1, 3)}ch` }}
                        className="h-auto min-w-0 max-w-[200px] rounded-none border-0 border-b-2 border-cyan-400 bg-transparent px-0 pb-0.5 text-2xl leading-normal font-extrabold tracking-tight text-white focus-visible:ring-0 dark:bg-transparent sm:max-w-xs sm:text-3xl md:max-w-md"
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Save title"
                        onMouseDown={(e) => e.preventDefault()}
                        className="shrink-0 text-cyan-400 hover:text-cyan-300"
                      >
                        <Check />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-normal border-b-2 border-transparent pb-0.5 truncate max-w-[220px] xs:max-w-[300px] sm:max-w-sm md:max-w-md">
                        {list.name}
                      </h1>
                      {canEdit && <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Rename list"
                              onClick={() => {
                                setTitleInput(list.name);
                                setIsEditingTitle(true);
                              }}
                              className="shrink-0 text-slate-500 opacity-70 group-hover/title:opacity-100 hover:text-cyan-300"
                            />
                          }
                        >
                          <Edit3 />
                        </TooltipTrigger>
                        <TooltipContent>Rename list</TooltipContent>
                      </Tooltip>}
                    </>
                  )}
                  <ModeBadge mode={list.selectionMode} className="shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
                  <span>
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                  <span>•</span>
                  {list.selectionMode !== "allow_repetition" ? (
                    <span className="text-cyan-300">
                      Round {list.currentRound || 1}: {selectedCountThisRound} / {items.length} picked
                    </span>
                  ) : (
                    <span className="text-purple-300">Repetition Allowed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <Button variant="outline" onClick={handleShare} className="h-9 shrink-0 rounded-xl font-mono text-xs text-slate-300 hover:text-white">
                {copiedLink ? (
                  <>
                    <Check className="text-emerald-400" />
                    <span className="font-semibold text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="text-cyan-400" />
                    Share Link
                  </>
                )}
              </Button>
              {canEdit && <Button variant="outline" onClick={() => setShowEditor(true)} className="h-9 shrink-0 rounded-xl font-mono text-xs text-slate-300 hover:text-white">
                <ListPlus className="text-cyan-400" />
                Edit Items ({items.length})
              </Button>}
              <Button variant="outline" onClick={() => setShowHistory(true)} className="h-9 shrink-0 rounded-xl font-mono text-xs text-slate-300 hover:text-white">
                <History className="text-purple-400" />
                History ({selections.length})
              </Button>
              {canEdit && <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label="List settings"
                      onClick={() => setShowSettings(true)}
                      className="shrink-0 rounded-xl text-slate-400 hover:text-white"
                    />
                  }
                >
                  <Settings />
                </TooltipTrigger>
                <TooltipContent>List settings</TooltipContent>
              </Tooltip>
              <ConfirmAction
                trigger={
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label="Delete list"
                    disabled={isDeletingList}
                    className="shrink-0 rounded-xl text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 />
                  </Button>
                }
                title={`Delete "${list.name}"?`}
                description="The list, its items and its history are deleted. This can't be undone."
                confirmLabel="Delete List"
                onConfirm={handleDeleteList}
              />
              </>}
            </div>
          </div>
        </div>

        {/* Notices */}
        {autoRestartNotice && (
          <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10 animate-in fade-in">
            <AlertDescription className="text-center font-mono text-xs text-emerald-300">{autoRestartNotice}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mb-4 border-rose-500/30 bg-rose-500/10 animate-in fade-in">
            <AlertDescription className="text-center font-mono text-xs text-rose-300">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Central Selector Visual Chamber */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8 space-y-4">
          {/* Active Themed Selector (Random by default or chosen in settings) */}
          <Selector
            items={items}
            isSelecting={isSelecting}
            selectedItem={selectedItem}
            animationDuration={list.animationDuration || 2.5}
            reducedMotion={list.reducedMotion || false}
            onAnimationComplete={handleAnimationComplete}
          />

          {/* Action Zone */}
          <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-sm">
            {!canEdit ? (
              <div className="text-xs font-mono text-slate-500 text-center">
                View only: picks made by the list owner show up here live.
              </div>
            ) : isRoundComplete ? (
              <div className="space-y-3 w-full text-center">
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider">
                  ★ Round {list.currentRound} Complete! All items selected.
                </div>
                <Button variant="cyber" size="xl" onClick={() => startNewRound(list._id)} className="w-full">
                  <RotateCcw />
                  Start Round {(list.currentRound || 1) + 1}
                </Button>
              </div>
            ) : (
              <Button
                variant={effectiveTheme === "crimson_arena" ? "default" : "cyber"}
                size="xl"
                onClick={handleSelect}
                disabled={isSelecting || items.length === 0}
                className={`h-16 w-full text-xl tracking-widest ${
                  effectiveTheme === "gold_stadium"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                    : effectiveTheme === "crimson_arena"
                    ? "bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white font-black border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                    : ""
                }`}
              >
                <Sparkles
                  className={`w-5 h-5 ${
                    effectiveTheme === "gold_stadium"
                      ? "text-black"
                      : effectiveTheme === "crimson_arena"
                      ? "text-amber-300"
                      : "text-cyan-300"
                  }`}
                />
                <span>{isSelecting ? "SELECTING..." : "SELECT"}</span>
              </Button>
            )}

            {canEdit && (
              <div className="text-[11px] font-mono text-slate-500 text-center">
                Press <Kbd>Space</Kbd> or click to select
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      {showWinnerModal && winnerItem && authoritativeResult && (
        <WinnerModal
          winner={winnerItem}
          round={authoritativeResult.round}
          selectionNumber={authoritativeResult.selectionNumber}
          isRoundComplete={authoritativeResult.isRoundComplete}
          theme={effectiveTheme}
          onClose={() => setShowWinnerModal(false)}
          onPickAgain={() => {
            setShowWinnerModal(false);
            setTimeout(() => handleSelect(), 250);
          }}
          onSkip={handleSkip}
        />
      )}

      {canEdit && (
        <>
          <ListEditorDrawer listId={list._id} items={items} open={showEditor} onOpenChange={setShowEditor} />
          <SettingsModal list={list} open={showSettings} onOpenChange={setShowSettings} />
        </>
      )}

      <HistoryDrawer
        listId={list._id}
        listName={list.name}
        selections={selections}
        readOnly={!canEdit}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </div>
  );
}
