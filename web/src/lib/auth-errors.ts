export type Step = "signIn" | "signUp" | "verify" | "forgot" | "reset";

/** Turns Convex Auth's raw errors into something a person can act on. */
export function friendly(err: unknown, step: Step): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/allowlist/i.test(raw)) return "This email is not on the allowlist.";
  if (/valid email/i.test(raw)) return "Enter a valid email address.";
  if (/at least 8/i.test(raw)) return "Password must be at least 8 characters.";
  if (/already exists/i.test(raw)) return "An account with this email already exists. Sign in instead.";
  if (/send the email/i.test(raw)) return "Could not send the email. Try again in a minute.";
  if (step === "verify" || step === "reset") return "That code is wrong or has expired.";
  if (/InvalidSecret|InvalidAccountId|Invalid password/i.test(raw)) return "Wrong email or password.";
  if (step === "forgot") return "Could not send a reset code.";
  return step === "signIn" ? "Could not sign in. Check your email and password." : "Could not create the account.";
}
