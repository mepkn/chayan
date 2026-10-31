/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { checkInput, secretMatches } from "./lib/kunji";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "kjs_test-secret";
const ME = "me@example.com";

beforeEach(() => {
  vi.stubEnv("KUNJI_SECRET", SECRET);
  vi.stubEnv("ALLOWED_EMAILS", ME);
  vi.stubEnv("SITE_URL", "https://picki.test/");
});
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: ME, emailVerificationTime: 1 });
    // An unverified sign-up with someone else's email must never count.
    await ctx.db.insert("users", { email: "other@example.com" });
    const list = { userId, currentRound: 2, animationDuration: 2.5, reducedMotion: false, createdAt: 1 };
    await ctx.db.insert("lists", { ...list, name: "Old", slug: "old-aaaaa", selectionMode: "allow_repetition", updatedAt: 1 });
    const listId = await ctx.db.insert("lists", { ...list, name: "Lunch", slug: "lunch-bbbbb", selectionMode: "no_repetition", updatedAt: 2 });
    const pizza = await ctx.db.insert("items", { listId, value: "Pizza", createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("items", { listId, value: "Dosa", createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("selections", { listId, itemId: pizza, itemValue: "Pizza", round: 1, selectionNumber: 1, selectedAt: 1000 });
    await ctx.db.insert("selections", { listId, itemId: pizza, itemValue: "Pizza", round: 2, selectionNumber: 2, selectedAt: 2000 });
  });
  return t;
}

const post = (body: unknown, secret = SECRET) => ({
  method: "POST",
  headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function call(t: Awaited<ReturnType<typeof setup>>, tool: string, input: unknown = {}, userEmail = ME) {
  const res = await t.fetch("/kunji/call", post({ tool, input, userEmail }));
  expect(res.status).toBe(200);
  return await res.json();
}

describe("secret check", () => {
  it("compares exactly", async () => {
    expect(await secretMatches(SECRET, SECRET)).toBe(true);
    expect(await secretMatches(SECRET + "x", SECRET)).toBe(false);
    expect(await secretMatches("", "")).toBe(false);
  });

  it.each([
    ["GET", "/kunji/tools"],
    ["POST", "/kunji/access"],
    ["POST", "/kunji/call"],
  ])("%s %s refuses a wrong or missing secret", async (method, path) => {
    const t = await setup();
    const body = method === "POST" ? JSON.stringify({ userEmail: ME, tool: "list_lists" }) : undefined;
    expect((await t.fetch(path, { method, headers: { Authorization: "Bearer nope" }, body })).status).toBe(401);
    expect((await t.fetch(path, { method, body })).status).toBe(401);
  });

  it("refuses everything when KUNJI_SECRET is unset", async () => {
    vi.stubEnv("KUNJI_SECRET", "");
    const t = await setup();
    expect((await t.fetch("/kunji/tools", { headers: { Authorization: "Bearer " } })).status).toBe(401);
  });
});

describe("GET /kunji/tools", () => {
  it("lists the tools with their schemas", async () => {
    const t = await setup();
    const res = await t.fetch("/kunji/tools", { headers: { Authorization: `Bearer ${SECRET}` } });
    const tools = (await res.json()) as { name: string; inputSchema: { type: string } }[];
    expect(tools.map((x) => x.name)).toEqual(["list_lists", "get_list", "pick_random", "add_item"]);
    expect(tools.every((x) => x.inputSchema.type === "object")).toBe(true);
  });
});

describe("POST /kunji/access", () => {
  it.each([
    [ME, "ok"],
    ["ME@Example.com ", "ok"],
    ["nobody@example.com", "no_account"],
    ["other@example.com", "no_account"], // unverified
  ])("%s → %s", async (userEmail, status) => {
    const t = await setup();
    const res = await t.fetch("/kunji/access", post({ userEmail }));
    expect(await res.json()).toEqual({ status });
  });

  it("is not_allowed once the email leaves ALLOWED_EMAILS", async () => {
    const t = await setup();
    vi.stubEnv("ALLOWED_EMAILS", "someone@else.com");
    const res = await t.fetch("/kunji/access", post({ userEmail: ME }));
    expect(await res.json()).toEqual({ status: "not_allowed" });
  });

  it("is no_account when two verified rows share the email", async () => {
    const t = await setup();
    await t.run(async (ctx) => void (await ctx.db.insert("users", { email: ME, emailVerificationTime: 1 })));
    const res = await t.fetch("/kunji/access", post({ userEmail: ME }));
    expect(await res.json()).toEqual({ status: "no_account" });
  });

  it("needs userEmail", async () => {
    const t = await setup();
    expect((await t.fetch("/kunji/access", post({}))).status).toBe(400);
  });
});

describe("POST /kunji/call", () => {
  it("refuses no_account and not_allowed", async () => {
    const t = await setup();
    expect(await call(t, "list_lists", {}, "nobody@example.com")).toMatchObject({ ok: false, error: { code: "no_account" } });
    vi.stubEnv("ALLOWED_EMAILS", "someone@else.com");
    expect(await call(t, "list_lists")).toMatchObject({ ok: false, error: { code: "not_allowed" } });
  });

  it("refuses unknown tools and bad input", async () => {
    const t = await setup();
    expect(await call(t, "delete_everything")).toMatchObject({ ok: false, error: { code: "unknown_tool" } });
    expect(await call(t, "get_list", {})).toMatchObject({ ok: false, error: { code: "bad_input", message: 'Missing "list".' } });
    expect(await call(t, "get_list", { list: "Lunch", historyLimit: 1.5 })).toMatchObject({ ok: false, error: { code: "bad_input" } });
  });

  it("list_lists lists most recently used first", async () => {
    const t = await setup();
    const { result } = await call(t, "list_lists");
    expect(result).toEqual([
      { name: "Lunch", slug: "lunch-bbbbb", url: "https://picki.test/lists/lunch-bbbbb", mode: "no_repetition", items: 2, round: 2, pickedThisRound: 1 },
      { name: "Old", slug: "old-aaaaa", url: "https://picki.test/lists/old-aaaaa", mode: "allow_repetition", items: 0, round: 2, pickedThisRound: 0 },
    ]);
  });

  it("get_list finds a list by name or slug, with this round's picks and history", async () => {
    const t = await setup();
    const byName = await call(t, "get_list", { list: " lunch " });
    expect(byName.result).toMatchObject({
      slug: "lunch-bbbbb",
      items: [
        { value: "Pizza", pickedThisRound: true },
        { value: "Dosa", pickedThisRound: false },
      ],
      recentPicks: [
        { value: "Pizza", round: 2 },
        { value: "Pizza", round: 1 },
      ],
    });
    const bySlug = await call(t, "get_list", { list: "lunch-bbbbb", historyLimit: 1 });
    expect(bySlug.result.recentPicks).toHaveLength(1);
    expect(await call(t, "get_list", { list: "Dinner" })).toEqual({
      ok: false,
      error: { code: "tool_error", message: 'No list "Dinner" in Picki. Use list_lists to see the names.' },
    });
  });

  it("pick_random follows the no_repetition round and records the pick", async () => {
    const t = await setup();
    const first = await call(t, "pick_random", { list: "Lunch" });
    expect(first).toMatchObject({ ok: true, result: { picked: "Dosa", round: 2, remainingInRound: 0, roundComplete: true } });
    expect(await call(t, "pick_random", { list: "Lunch" })).toEqual({
      ok: false,
      error: { code: "tool_error", message: "Round complete. Please start a new round." },
    });
    expect(await t.run(async (ctx) => (await ctx.db.query("selections").collect()).length)).toBe(3);
    expect(await call(t, "pick_random", { list: "Old" })).toMatchObject({ ok: false, error: { message: "Your list is empty. Add items before selecting." } });
  });

  it("add_item adds a trimmed item", async () => {
    const t = await setup();
    expect(await call(t, "add_item", { list: "lunch-bbbbb", value: "  Thali " })).toEqual({ ok: true, result: { list: "Lunch", added: "Thali", items: 3 } });
    expect(await call(t, "add_item", { list: "Lunch", value: "  " })).toMatchObject({ ok: false, error: { code: "tool_error" } });
    expect(await call(t, "add_item", { list: "Lunch" })).toMatchObject({ ok: false, error: { code: "bad_input" } });
  });

  it("never shows another user's lists", async () => {
    const t = await setup();
    vi.stubEnv("ALLOWED_EMAILS", `${ME},b@example.com`);
    await t.run(async (ctx) => void (await ctx.db.insert("users", { email: "b@example.com", emailVerificationTime: 1 })));
    expect((await call(t, "list_lists", {}, "b@example.com")).result).toEqual([]);
    for (const [tool, input] of [["get_list", { list: "lunch-bbbbb" }], ["pick_random", { list: "Lunch" }], ["add_item", { list: "Lunch", value: "x" }]] as const) {
      expect(await call(t, tool, input, "b@example.com")).toMatchObject({ ok: false, error: { code: "tool_error" } });
    }
    expect(await t.run(async (ctx) => (await ctx.db.query("items").collect()).length)).toBe(2);
  });
});

describe("checkInput", () => {
  const schema = { type: "object", properties: { n: { type: "integer" } }, additionalProperties: false } as const;
  it("checks types and unknown fields", () => {
    expect(checkInput(schema, { n: 2 })).toBeNull();
    expect(checkInput(schema, { n: 2.5 })).toBe('"n" must be an integer.');
    expect(checkInput(schema, { x: 1 })).toBe('Unknown field "x".');
    expect(checkInput(schema, [])).toBe("Input must be a JSON object.");
  });
});
