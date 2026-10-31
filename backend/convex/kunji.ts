import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { findKunjiUser, type KunjiTool } from "./lib/kunji";
import { pickFrom } from "./selections";

// Picki's tools for kunji (kunji SPEC.md → App contract). Each runs as the user
// kunji named and only ever sees that user's lists. Writes: pick_random (records
// the pick, like the app's Pick button) and add_item; nothing deletes.

const listUrl = (slug: string) => `${(process.env.SITE_URL ?? "").replace(/\/+$/, "")}/lists/${slug}`;

export const access = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => await findKunjiUser(ctx, email),
});

async function userLists(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("lists")
    .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();
}

/** The user's list by slug, else by name (case-insensitive); null when none or ambiguous. */
async function findList(ctx: QueryCtx, userId: Id<"users">, list: string): Promise<Doc<"lists"> | null> {
  const lists = await userLists(ctx, userId);
  const key = list.trim().toLowerCase();
  const bySlug = lists.find((l) => l.slug === key);
  if (bySlug) return bySlug;
  const byName = lists.filter((l) => l.name.trim().toLowerCase() === key);
  return byName.length === 1 ? byName[0] : null;
}

export const listLists = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const lists = await userLists(ctx, userId);
    return Promise.all(
      lists.map(async (l) => {
        const items = await ctx.db.query("items").withIndex("by_listId", (q) => q.eq("listId", l._id)).collect();
        const picked = await ctx.db
          .query("selections")
          .withIndex("by_list_round", (q) => q.eq("listId", l._id).eq("round", l.currentRound))
          .collect();
        return {
          name: l.name,
          slug: l.slug,
          url: listUrl(l.slug),
          mode: l.selectionMode,
          items: items.length,
          round: l.currentRound,
          pickedThisRound: picked.length,
        };
      }),
    );
  },
});

export const getList = internalQuery({
  args: { userId: v.id("users"), list: v.string(), historyLimit: v.number() },
  handler: async (ctx, { userId, list, historyLimit }) => {
    const l = await findList(ctx, userId, list);
    if (l === null) return null;
    const items = await ctx.db.query("items").withIndex("by_listId", (q) => q.eq("listId", l._id)).collect();
    const history = await ctx.db
      .query("selections")
      .withIndex("by_listId", (q) => q.eq("listId", l._id))
      .order("desc")
      .take(historyLimit);
    const pickedIds = new Set(
      (
        await ctx.db
          .query("selections")
          .withIndex("by_list_round", (q) => q.eq("listId", l._id).eq("round", l.currentRound))
          .collect()
      ).map((s) => s.itemId),
    );
    return {
      name: l.name,
      slug: l.slug,
      url: listUrl(l.slug),
      mode: l.selectionMode,
      round: l.currentRound,
      // pickedThisRound matters only when the mode doesn't repeat items.
      items: items.map((i) => ({ value: i.value, pickedThisRound: pickedIds.has(i._id) })),
      recentPicks: history.map((s) => ({ value: s.itemValue, round: s.round, at: new Date(s.selectedAt).toISOString() })),
    };
  },
});

async function requireList(ctx: QueryCtx, userId: Id<"users">, list: string) {
  const l = await findList(ctx, userId, list);
  if (l === null) throw new ConvexError(`No list "${list}" in Picki. Use list_lists to see the names.`);
  return l;
}

export const pickRandom = internalMutation({
  args: { userId: v.id("users"), list: v.string() },
  handler: async (ctx, { userId, list }) => {
    const l = await requireList(ctx, userId, list);
    const r = await pickFrom(ctx, l);
    return {
      list: l.name,
      picked: r.selectedItem.value,
      round: r.round,
      remainingInRound: r.remainingInRound,
      roundComplete: r.isRoundComplete,
      newRoundStarted: r.autoRestarted,
      url: listUrl(l.slug),
    };
  },
});

export const addItem = internalMutation({
  args: { userId: v.id("users"), list: v.string(), value: v.string() },
  handler: async (ctx, { userId, list, value }) => {
    const l = await requireList(ctx, userId, list);
    const trimmed = value.trim();
    if (!trimmed) throw new ConvexError("The item can't be empty.");
    if (trimmed.length > 500) throw new ConvexError("The item is too long (500 characters at most).");
    const now = Date.now();
    await ctx.db.insert("items", { listId: l._id, value: trimmed, createdAt: now, updatedAt: now });
    await ctx.db.patch(l._id, { updatedAt: now });
    const count = (await ctx.db.query("items").withIndex("by_listId", (q) => q.eq("listId", l._id)).collect()).length;
    return { list: l.name, added: trimmed, items: count };
  },
});

const LIST_INPUT = { type: "string", description: "The list's name or slug (from list_lists)." } as const;

export const tools: KunjiTool[] = [
  {
    name: "list_lists",
    description:
      "List the user's Picki lists (random pickers), most recently used first, with item counts, selection mode and how many items were picked in the current round.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (ctx, userId) => await ctx.runQuery(internal.kunji.listLists, { userId }),
  },
  {
    name: "get_list",
    description:
      "One Picki list by name or slug: its items (and which were already picked this round) and the most recent picks.",
    inputSchema: {
      type: "object",
      properties: {
        list: LIST_INPUT,
        historyLimit: { type: "integer", description: "At most this many recent picks (default 10, max 100)." },
      },
      required: ["list"],
      additionalProperties: false,
    },
    handler: async (ctx, userId, input) => {
      const historyLimit = Math.min(Math.max(Number(input.historyLimit ?? 10), 0), 100);
      const list = String(input.list);
      const result = await ctx.runQuery(internal.kunji.getList, { userId, list, historyLimit });
      if (result === null) throw new ConvexError(`No list "${list}" in Picki. Use list_lists to see the names.`);
      return result;
    },
  },
  {
    name: "pick_random",
    description:
      "Pick a random item from one of the user's Picki lists and record it in the list's history, like pressing Pick in the app. Follows the list's mode: no_repetition skips items already picked this round (and fails once the round is complete), auto_restart starts a new round when all were picked, allow_repetition may repeat.",
    inputSchema: { type: "object", properties: { list: LIST_INPUT }, required: ["list"], additionalProperties: false },
    handler: async (ctx, userId, input) => await ctx.runMutation(internal.kunji.pickRandom, { userId, list: String(input.list) }),
  },
  {
    name: "add_item",
    description: "Add one item to one of the user's Picki lists.",
    inputSchema: {
      type: "object",
      properties: { list: LIST_INPUT, value: { type: "string", description: "The item's text." } },
      required: ["list", "value"],
      additionalProperties: false,
    },
    handler: async (ctx, userId, input) =>
      await ctx.runMutation(internal.kunji.addItem, { userId, list: String(input.list), value: String(input.value) }),
  },
];
