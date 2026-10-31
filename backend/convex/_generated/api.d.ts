/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as kunji from "../kunji.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_allowlist from "../lib/allowlist.js";
import type * as lib_kunji from "../lib/kunji.js";
import type * as lists from "../lists.js";
import type * as migrations from "../migrations.js";
import type * as otp from "../otp.js";
import type * as selections from "../selections.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  items: typeof items;
  kunji: typeof kunji;
  "lib/access": typeof lib_access;
  "lib/allowlist": typeof lib_allowlist;
  "lib/kunji": typeof lib_kunji;
  lists: typeof lists;
  migrations: typeof migrations;
  otp: typeof otp;
  selections: typeof selections;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
