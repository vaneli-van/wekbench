## Goal of this phase

Turn the landing page CTAs into a real B2B sign-up / sign-in flow, gate the app behind login, run a short onboarding (profile + workspace + demo-data choice), and seed real data when the user opts in. After this phase, every screen the AI has already built will be reading from real per-user data — and ready for the next phase of wiring individual actions.

We're scoping this phase to **landing → auth → onboarding → dashboard**. Wiring individual buttons inside Orders / Invoices / RFQs / Inbox comes in later phases.

## B2B sign-in approach (your question about Gmail)

You're right — for a B2B procurement platform, a generic "Continue with Google" button (with the rainbow G icon) signals consumer/personal use and can hurt trust. Recommended approach:

- **Primary CTA: "Continue with work email"** — email + password. Validate the email on the client to softly discourage free-mail domains (`gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com` personal, etc.) with a gentle nudge ("Use your work email for full team features") but don't hard-block — small businesses legitimately use Gmail.
- **Secondary: "Continue with Microsoft"** — Outlook / Microsoft 365 / Azure AD covers the vast majority of business users. Requires the Supabase Integration (not native to Lovable Cloud), so we'll either (a) skip OAuth in this phase and ship email-only first, or (b) connect Supabase directly so we can enable the Microsoft provider.
- **Later: SAML SSO** — for enterprise customers. Slot for Phase 3+.
- **Skip Google entirely** for now to keep the B2B positioning clean.

**My recommendation for this phase:** ship email/password only, styled as "Continue with work email", with a placeholder "Microsoft sign-in coming soon" tile. Cleanest, fastest, no extra integration to set up. We add Microsoft in a follow-up once you're ready to connect Supabase directly.

## Demo data vs blank workspace (your question)

Yes — we'll ask this during onboarding as a dedicated step, styled to match the existing onboarding screen. Two cards side-by-side:

- **"Start with sample data"** — populated workspace (suppliers, buyers, sample orders, invoices, RFQs, documents) so you can explore every screen immediately.
- **"Start fresh"** — empty workspace with friendly empty states on each screen, guided next-steps ("Add your first supplier", "Create your first RFQ").

Stored as a `workspace.seeded_demo` flag so we can later offer a "Load sample data" button in Settings if they change their mind.

## Step-by-step plan

### Step 1 — Enable Lovable Cloud
Provision the backend (auth + Postgres + storage).

### Step 2 — Database schema (migration)
- `profiles` — `id` (FK → auth.users), `full_name`, `company_name`, `role` (Buyer / Supplier / Procurement Manager / Finance / Other), `avatar_url`, `phone`, `created_at`. RLS: users read/update own row only. Auto-created via `handle_new_user` trigger on signup.
- `workspaces` — `id`, `owner_id`, `name`, `seeded_demo` (boolean), `onboarding_completed_at`. RLS: owner-only for now (team membership comes later).
- `user_roles` + `app_role` enum + `has_role()` security-definer function (per Lovable's role pattern — never store role on profiles for permission checks).
- Domain tables stubbed for seeding: `suppliers`, `buyers`, `orders`, `invoices`, `rfqs`, `documents`. Each has `workspace_id`, RLS scoped to workspace ownership, GRANTs to `authenticated`.

### Step 3 — Landing page CTA wiring
- Hero "Get started" / "Sign up" buttons → `/signup`
- Nav "Sign in" → `/signin`
- Any "Book a demo" / "Talk to sales" → `mailto:` or a simple contact dialog (no backend yet)

### Step 4 — Auth pages rebuild (`/signup`, `/signin`)
Restyle to match the existing dark theme. Single primary card:
- "Continue with work email" form (email + password, with confirm-password on signup)
- Soft personal-email warning (non-blocking)
- "Microsoft sign-in — coming soon" disabled tile
- Forgot-password link → `/reset-password` (separate public route, required)
- Cross-link between signup ↔ signin

Implementation rules: `onAuthStateChange` listener set up first, `emailRedirectTo: window.location.origin` on signup, redirect to `/onboarding` after signup, `/dashboard` after signin.

### Step 5 — Route gating
- Move all `_app.*` routes under `src/routes/_authenticated/` (integration-managed pathless layout, `ssr: false`, redirects to `/signin` if no session).
- Landing (`/`), `/signin`, `/signup`, `/reset-password`, `/track/$token` stay public.
- Unauthenticated visit to a protected route → bounce to `/signin` with `?redirect=` param.

### Step 6 — Onboarding flow (`/onboarding`)
Multi-step wizard matching current design language. Existing `onboarding.tsx` is restyled / extended:
1. **Profile** — full name, company, role dropdown, optional avatar upload (to Lovable Cloud storage).
2. **Workspace** — workspace name (defaults to company name).
3. **Choose your starting point** — the two cards described above.
4. **Done** — confetti + "Take me to my dashboard".

Each step persists immediately so refresh doesn't lose progress. `onboarding_completed_at` is set on finish; the `_authenticated` layout redirects to `/onboarding` if it's null.

### Step 7 — Demo-data seeding
If the user picks "Start with sample data," a server function (`seedWorkspaceDemo`) inserts the existing mock fixtures (from current TS files) into the user's workspace — suppliers, buyers, a handful of orders in various statuses, matching invoices, one open RFQ, sample documents. Idempotent (no-op if already seeded). Runs server-side using the admin client inside the handler.

### Step 8 — Dashboard wired to real data
Replace the dashboard's mock imports with TanStack Query reads from the new tables via `createServerFn` + `requireSupabaseAuth`. Empty states for users who chose "Start fresh."

### Step 9 — Header / user menu
Top-right avatar menu in the app shell: name + email, "Settings", "Sign out". Sign-out follows the canonical hygiene pattern (cancel queries → clear cache → `signOut()` → `navigate /signin replace`).

### Step 10 — Verify & publish-ready
- Manually run through: landing → signup → onboarding (both paths) → dashboard → sign out → signin → dashboard.
- Confirm RLS by checking a second account can't see the first account's data.
- Confirm no build/typecheck errors.

## Out of scope for this phase (next phases)

- Microsoft / SSO sign-in (Phase 1.5, requires Supabase integration)
- Wiring individual actions inside Orders, Invoices, RFQs, Inbox, Catalog, Documents (Phases 2–4, one domain per phase)
- Email notifications, AI matching, payments, integrations setup
- Team members / multi-seat workspaces

## Technical notes

- Auth provider: Lovable Cloud (Supabase under the hood) — email/password only this phase.
- Profile creation: `handle_new_user` trigger on `auth.users` insert → row in `profiles` + default `workspaces` row + `user_roles` entry (`'owner'`).
- All server reads: `createServerFn` + `requireSupabaseAuth`, called from components via `useServerFn` + `useQuery` (never from public-route loaders).
- Seeding: admin client loaded inside the handler (`await import('@/integrations/supabase/client.server')`), never at module scope.
- All new screens follow the existing dark-theme tokens already in `src/styles.css` — no new color tokens unless needed.

## Question before I build

Confirm the Microsoft sign-in approach: **ship email-only now and add Microsoft later** (recommended, faster), or **pause Step 4 to connect Supabase directly so Microsoft is in from day one**?