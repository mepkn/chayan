// Mirrors the selection algorithm in convex/selections.ts so its round rules can be tested without a backend.
import { describe, expect, it } from "vitest";

interface ListItem {
  _id: string;
  listId: string;
  value: string;
}

interface SelectionRecord {
  _id: string;
  listId: string;
  itemId?: string;
  itemValue: string;
  round: number;
  selectionNumber: number;
  selectedAt: number;
}

type ChayanSelectionMode = "no_repetition" | "allow_repetition" | "auto_restart";

interface ListDoc {
  _id: string;
  name: string;
  selectionMode: ChayanSelectionMode;
  currentRound: number;
}

function simulateSelection(
  list: ListDoc,
  items: ListItem[],
  selections: SelectionRecord[]
): {
  chosenItem: ListItem;
  newRound: number;
  isRoundComplete: boolean;
  autoRestarted: boolean;
  newSelection: SelectionRecord;
} {
  if (items.length === 0) {
    throw new Error("Your list is empty. Add items before selecting.");
  }

  let activeRound = list.currentRound || 1;
  let eligibleItems: ListItem[];
  let autoRestarted = false;

  if (list.selectionMode === "allow_repetition") {
    eligibleItems = [...items];
  } else {
    const roundSelections = selections.filter(
      (s) => s.listId === list._id && s.round === activeRound
    );
    const selectedItemIds = new Set(roundSelections.map((s) => s.itemId).filter(Boolean));

    // Filter by item ID so duplicates remain distinct entries
    eligibleItems = items.filter((item) => !selectedItemIds.has(item._id));

    if (eligibleItems.length === 0) {
      if (list.selectionMode === "auto_restart") {
        activeRound = activeRound + 1;
        eligibleItems = [...items];
        autoRestarted = true;
      } else {
        throw new Error("Round complete. Please start a new round.");
      }
    }
  }

  const chosen = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
  const selectionNumber = selections.filter((s) => s.listId === list._id).length + 1;

  const newSelection: SelectionRecord = {
    _id: `sel_${Date.now()}_${Math.random()}`,
    listId: list._id,
    itemId: chosen._id,
    itemValue: chosen.value,
    round: activeRound,
    selectionNumber,
    selectedAt: Date.now(),
  };

  const remainingInRound =
    list.selectionMode === "allow_repetition"
      ? items.length
      : eligibleItems.length - 1;

  const isRoundComplete =
    list.selectionMode === "no_repetition" && remainingInRound === 0;

  return {
    chosenItem: chosen,
    newRound: activeRound,
    isRoundComplete,
    autoRestarted,
    newSelection,
  };
}

function assert(condition: boolean, msg: string) {
  expect(condition, msg).toBe(true);
}

describe("selection algorithm", () => {
it("no repetition picks each item once per round", () => {
  const list: ListDoc = { _id: "l1", name: "Team Sync", selectionMode: "no_repetition", currentRound: 1 };
  const items: ListItem[] = [
    { _id: "i1", listId: "l1", value: "Praveen" },
    { _id: "i2", listId: "l1", value: "David" },
    { _id: "i3", listId: "l1", value: "Tobi" },
    { _id: "i4", listId: "l1", value: "Arnold" },
  ];
  const selections: SelectionRecord[] = [];

  for (let i = 0; i < 4; i++) {
    const res = simulateSelection(list, items, selections);
    selections.push(res.newSelection);
    if (i < 3) {
      assert(!res.isRoundComplete, `Pick ${i + 1} should not complete round`);
    } else {
      assert(res.isRoundComplete, "Pick 4 should mark round complete");
    }
  }

  // 5th pick should throw "Round complete"
  let threw = false;
  try {
    simulateSelection(list, items, selections);
  } catch (err: unknown) {
    threw = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("Round complete"), "Error message specifies round complete");
  }
  assert(threw, "No repetition prevents picking after round is complete");

  // Distinct items picked
  const pickedIds = new Set(selections.map((s) => s.itemId));
  assert(pickedIds.size === 4, "All 4 unique items were selected exactly once");
});

it("duplicate values are distinct entries", () => {
  const list: ListDoc = { _id: "l2", name: "Raffle", selectionMode: "no_repetition", currentRound: 1 };
  const items: ListItem[] = [
    { _id: "john_1", listId: "l2", value: "John" },
    { _id: "john_2", listId: "l2", value: "John" },
    { _id: "david", listId: "l2", value: "David" },
  ];
  const selections: SelectionRecord[] = [];

  // Pick 3 times
  for (let i = 0; i < 3; i++) {
    const res = simulateSelection(list, items, selections);
    selections.push(res.newSelection);
  }

  const pickedIds = new Set(selections.map((s) => s.itemId));
  assert(pickedIds.has("john_1") && pickedIds.has("john_2") && pickedIds.has("david"), "Duplicate 'John' values were both selected as distinct entities");
});

it("auto-restart rolls over to the next round", () => {
  const list: ListDoc = { _id: "l3", name: "Quick Pick", selectionMode: "auto_restart", currentRound: 1 };
  const items: ListItem[] = [
    { _id: "a", listId: "l3", value: "Alpha" },
    { _id: "b", listId: "l3", value: "Beta" },
  ];
  const selections: SelectionRecord[] = [];

  // Pick 2 items in round 1
  const p1 = simulateSelection(list, items, selections);
  selections.push(p1.newSelection);
  const p2 = simulateSelection(list, items, selections);
  selections.push(p2.newSelection);

  assert(p1.newRound === 1 && p2.newRound === 1, "Picks 1 and 2 were in round 1");

  // Pick 3 should automatically roll over to round 2
  const p3 = simulateSelection(list, items, selections);
  selections.push(p3.newSelection);
  list.currentRound = p3.newRound;

  assert(p3.autoRestarted, "Pick 3 triggered auto-restart");
  assert(p3.newRound === 2, "Pick 3 advanced to round 2");
  assert(p3.newSelection.round === 2, "Selection record has round 2");
});

it("allow repetition never completes a round", () => {
  const list: ListDoc = { _id: "l4", name: "Infinite Dice", selectionMode: "allow_repetition", currentRound: 1 };
  const items: ListItem[] = [
    { _id: "single", listId: "l4", value: "Only Choice" },
  ];
  const selections: SelectionRecord[] = [];

  for (let i = 0; i < 10; i++) {
    const res = simulateSelection(list, items, selections);
    selections.push(res.newSelection);
    assert(!res.isRoundComplete, `Pick ${i + 1} does not end round in allow_repetition`);
  }
  assert(selections.length === 10, "10 selections recorded smoothly in allow_repetition");
});

it("skipping a pick returns the item to the pool", () => {
  const list: ListDoc = { _id: "l5", name: "Standup Leader", selectionMode: "no_repetition", currentRound: 1 };
  const items: ListItem[] = [
    { _id: "praveen", listId: "l5", value: "Praveen" },
    { _id: "david", listId: "l5", value: "David" },
    { _id: "tobi", listId: "l5", value: "Tobi" },
  ];
  let selections: SelectionRecord[] = [];

  // Pick 1: suppose "David" gets selected
  const pick1 = simulateSelection(list, items, selections);
  selections.push(pick1.newSelection);

  // But David is absent today! User skips David -> delete selection from list
  const absentItemId = pick1.chosenItem._id;
  selections = selections.filter((s) => s.itemId !== absentItemId);

  // Assert David is no longer recorded in selections
  assert(!selections.some((s) => s.itemId === absentItemId), "Absent candidate selection was successfully voided/skipped");

  // Re-pick: David is still in eligibleItems pool along with others
  const repick = simulateSelection(list, items, selections);
  selections.push(repick.newSelection);

  assert(selections.length === 1, "Only 1 active selection recorded after skip and re-pick");
  assert(!repick.isRoundComplete, "Round is not complete yet after re-pick");
});
});
