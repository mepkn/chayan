import React, { useState, useMemo } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ListDoc, SelectionResult, SelectionMode, AnimationTheme } from "./types";
import { ChayanContext, type ChayanContextType } from "./chayan-context";
import { toListDoc } from "./list-doc";

/** The signed-in user's lists plus every mutation. Items and selections are queried live by the list page. */
export function ChayanProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const rawLists = useQuery(api.lists.getAllLists);
  const [activeSelectingId, setActiveSelectingId] = useState<string | null>(null);

  const lists: ListDoc[] = useMemo(() => (rawLists ?? []).map(toListDoc), [rawLists]);

  const createList = async (params: {
    name: string;
    items?: string[];
    selectionMode?: SelectionMode;
    animationTheme?: AnimationTheme;
  }) => {
    const res = await convex.mutation(api.lists.createList, params);
    return { listId: res.listId as string, slug: res.slug };
  };

  const updateList = async (params: {
    listId: string;
    name?: string;
    selectionMode?: SelectionMode;
    animationDuration?: number;
    reducedMotion?: boolean;
    animationTheme?: AnimationTheme;
  }) => {
    await convex.mutation(api.lists.updateList, { ...params, listId: params.listId as Id<"lists"> });
  };

  const deleteList = async (listId: string) => {
    await convex.mutation(api.lists.deleteList, { listId: listId as Id<"lists"> });
  };

  const duplicateList = async (listId: string) => {
    const res = await convex.mutation(api.lists.duplicateList, { listId: listId as Id<"lists"> });
    return { listId: res.listId as string, slug: res.slug };
  };

  const startNewRound = async (listId: string) => {
    return await convex.mutation(api.lists.startNewRound, { listId: listId as Id<"lists"> });
  };

  const addItem = async (listId: string, value: string) => {
    const res = await convex.mutation(api.items.addItem, { listId: listId as Id<"lists">, value });
    return res as string;
  };

  const addItemsBulk = async (listId: string, values: string[]) => {
    const res = await convex.mutation(api.items.addItemsBulk, { listId: listId as Id<"lists">, values });
    return res as string[];
  };

  const updateItem = async (itemId: string, value: string) => {
    await convex.mutation(api.items.updateItem, { itemId: itemId as Id<"items">, value });
  };

  const deleteItem = async (itemId: string) => {
    await convex.mutation(api.items.deleteItem, { itemId: itemId as Id<"items"> });
  };

  const clearItems = async (listId: string) => {
    await convex.mutation(api.items.clearItems, { listId: listId as Id<"lists"> });
  };

  const selectRandomItem = async (listId: string): Promise<SelectionResult> => {
    if (activeSelectingId === listId) {
      throw new Error("A selection is already in progress.");
    }
    setActiveSelectingId(listId);
    try {
      const res = await convex.mutation(api.selections.selectRandomItem, {
        listId: listId as Id<"lists">,
      });
      return {
        selectionId: res.selectionId as string,
        selectedItem: {
          _id: res.selectedItem._id as string,
          value: res.selectedItem.value,
        },
        round: res.round,
        selectionNumber: res.selectionNumber,
        isRoundComplete: res.isRoundComplete,
        remainingInRound: res.remainingInRound,
        autoRestarted: res.autoRestarted,
      };
    } finally {
      setActiveSelectingId(null);
    }
  };

  const clearSelections = async (listId: string) => {
    await convex.mutation(api.selections.clearSelections, { listId: listId as Id<"lists"> });
  };

  const deleteSelection = async (selectionId: string) => {
    await convex.mutation(api.selections.deleteSelection, {
      selectionId: selectionId as Id<"selections">,
    });
  };

  const value: ChayanContextType = {
    lists,
    createList,
    updateList,
    deleteList,
    duplicateList,
    startNewRound,
    addItem,
    addItemsBulk,
    updateItem,
    deleteItem,
    clearItems,
    selectRandomItem,
    clearSelections,
    deleteSelection,
  };

  return <ChayanContext.Provider value={value}>{children}</ChayanContext.Provider>;
}
