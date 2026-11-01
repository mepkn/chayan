import { createContext, useContext } from "react";
import type { ListDoc, SelectionResult, SelectionMode, AnimationTheme } from "./types";

export interface ChayanContextType {
  lists: ListDoc[];
  createList: (params: {
    name: string;
    items?: string[];
    selectionMode?: SelectionMode;
    animationTheme?: AnimationTheme;
  }) => Promise<{ listId: string; slug: string }>;
  updateList: (params: {
    listId: string;
    name?: string;
    selectionMode?: SelectionMode;
    animationDuration?: number;
    reducedMotion?: boolean;
    animationTheme?: AnimationTheme;
  }) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  duplicateList: (listId: string) => Promise<{ listId: string; slug: string }>;
  startNewRound: (listId: string) => Promise<{ newRound: number }>;
  addItem: (listId: string, value: string) => Promise<string>;
  addItemsBulk: (listId: string, values: string[]) => Promise<string[]>;
  updateItem: (itemId: string, value: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearItems: (listId: string) => Promise<void>;
  selectRandomItem: (listId: string) => Promise<SelectionResult>;
  clearSelections: (listId: string) => Promise<void>;
  deleteSelection: (selectionId: string) => Promise<void>;
}

export const ChayanContext = createContext<ChayanContextType | null>(null);

export function useChayan() {
  const context = useContext(ChayanContext);
  if (!context) {
    throw new Error("useChayan must be used within a ChayanProvider");
  }
  return context;
}
