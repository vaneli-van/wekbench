/**
 * Server-only telemetry helper. Best-effort: never throws, never blocks the caller.
 * Powers the adoption "risk register" — the events here map 1:1 to the abandonment
 * points we want to watch (time-to-first-quote, per-line corrections, % auto-sourced,
 * buyer-link engagement, invoice exports, pasted-RFQ cold-start).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function emitProductEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    workspaceId?: string | null;
    userId?: string | null;
    event: string;
    props?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("product_events").insert({
      workspace_id: args.workspaceId ?? null,
      user_id: args.userId ?? null,
      event: args.event,
      props: (args.props ?? {}) as never,
    });
  } catch (e) {
    console.error("[telemetry] emit failed:", args.event, e);
  }
}
