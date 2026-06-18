// Freemium plan constants + the shared "upgrade required" protocol. SAFE FOR CLIENT
// AND SERVER (no secrets, no server-only imports). Server functions throw an
// upgradeError(); the UI uses parseUpgrade() to detect it and show the paywall.

export const TRIAL_DAYS = 14;
export const STARTER_QUOTE_CAP = 10; // active quotes per calendar month on Starter
export const STARTER_SEAT_CAP = 1; // users on Starter

export type Plan = "starter" | "pro";
export type UpgradeFeature = "quotes" | "seats" | "sourcing" | "ar";

const UPGRADE_PREFIX = "UPGRADE_REQUIRED";

/** Build the structured error a gated server function throws. */
export function upgradeError(feature: UpgradeFeature): Error {
  return new Error(`${UPGRADE_PREFIX}:${feature}`);
}

/** Detect an upgrade-required error (from a thrown/serialized server error). */
export function parseUpgrade(err: unknown): UpgradeFeature | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.match(/UPGRADE_REQUIRED:(\w+)/);
  return m ? (m[1] as UpgradeFeature) : null;
}

/** User-facing copy for each paywall, keyed by feature. */
export const FEATURE_COPY: Record<UpgradeFeature, { title: string; body: string }> = {
  quotes: {
    title: "You've reached the Starter quote limit",
    body: `Starter includes ${STARTER_QUOTE_CAP} active quotes a month. Upgrade to Pro for unlimited quotes.`,
  },
  seats: {
    title: "Add your team with Pro",
    body: "Starter includes 1 user. Upgrade to Pro to invite teammates.",
  },
  sourcing: {
    title: "Unlock full sourcing with Pro",
    body: "Starter sources from one provider. Pro fans out across every sourcing provider.",
  },
  ar: {
    title: "Get paid faster with Pro",
    body: "Payment reminders, customer statements, and aging automation are part of Pro.",
  },
};
