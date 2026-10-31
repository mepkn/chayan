import { mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getOwnedList } from "./lib/access";

export const selectRandomItem = mutation({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => pickFrom(ctx, await getOwnedList(ctx, args.listId)),
});

/** Picks and records one item of a list the caller already owns (also used by kunji's pick_random). */
export async function pickFrom(ctx: MutationCtx, list: Doc<"lists">) {
  const args = { listId: list._id };
  const items = await ctx.db
    .query("items")
    .withIndex("by_listId", (q) => q.eq("listId", args.listId))
    .collect();

  if (items.length === 0) {
    throw new ConvexError("Your list is empty. Add items before selecting.");
  }

  let activeRound = list.currentRound || 1;
  let eligibleItems: typeof items;
  let autoRestarted = false;

  if (list.selectionMode === "allow_repetition") {
    eligibleItems = [...items];
  } else {
    // Fetch selections for the current round
    const roundSelections = await ctx.db
      .query("selections")
      .withIndex("by_list_round", (q) =>
        q.eq("listId", args.listId).eq("round", activeRound)
      )
      .collect();

    const selectedItemIds = new Set(
      roundSelections.map((s) => s.itemId).filter(Boolean)
    );

    // Filter eligible items by item ID (duplicate values remain distinct items)
    eligibleItems = items.filter((item) => !selectedItemIds.has(item._id));

    if (eligibleItems.length === 0) {
      if (list.selectionMode === "auto_restart") {
        // Auto restart: increment round and make all items eligible
        activeRound = activeRound + 1;
        await ctx.db.patch(args.listId, {
          currentRound: activeRound,
          updatedAt: Date.now(),
        });
        eligibleItems = [...items];
        autoRestarted = true;
      } else {
        // "no_repetition"
        throw new ConvexError("Round complete. Please start a new round.");
      }
    }
  }

  // Authoritative random selection
  const randomIndex = Math.floor(Math.random() * eligibleItems.length);
  const chosenItem = eligibleItems[randomIndex];

  // Compute overall selection sequence number
  const totalSelections = await ctx.db
    .query("selections")
    .withIndex("by_listId", (q) => q.eq("listId", args.listId))
    .collect();
  const selectionNumber = totalSelections.length + 1;

  const now = Date.now();
  const selectionId = await ctx.db.insert("selections", {
    listId: args.listId,
    itemId: chosenItem._id,
    itemValue: chosenItem.value,
    round: activeRound,
    selectionNumber,
    selectedAt: now,
  });

  await ctx.db.patch(args.listId, { updatedAt: now });

  const remainingInRound =
    list.selectionMode === "allow_repetition"
      ? items.length
      : eligibleItems.length - 1;

  const isRoundComplete =
    list.selectionMode === "no_repetition" && remainingInRound === 0;

  return {
    selectionId,
    selectedItem: {
      _id: chosenItem._id,
      value: chosenItem.value,
    },
    round: activeRound,
    selectionNumber,
    isRoundComplete,
    remainingInRound,
    autoRestarted,
  };
}

export const getSelections = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("selections")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .order("desc")
      .collect();
  },
});

export const clearSelections = mutation({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    await getOwnedList(ctx, args.listId);
    const selections = await ctx.db
      .query("selections")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    for (const sel of selections) {
      await ctx.db.delete(sel._id);
    }

    await ctx.db.patch(args.listId, { updatedAt: Date.now() });
    return { count: selections.length };
  },
});

export const deleteSelection = mutation({
  args: {
    selectionId: v.id("selections"),
  },
  handler: async (ctx, args) => {
    const selection = await ctx.db.get(args.selectionId);
    if (!selection) return null;
    await getOwnedList(ctx, selection.listId);

    await ctx.db.delete(args.selectionId);
    await ctx.db.patch(selection.listId, { updatedAt: Date.now() });
    return {
      success: true,
      listId: selection.listId,
      itemId: selection.itemId,
      itemValue: selection.itemValue,
    };
  },
});
