import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Get started — wekbench" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center"><Wordmark size="lg" /></div>
        <h1 className="mt-6 text-center text-xl font-semibold tracking-tight text-foreground">
          Create your workspace
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Start quoting in seconds
        </p>
        <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Full name"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="email"
            placeholder="Work email"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="text"
            placeholder="Company"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <Button asChild className="mt-1"><Link to="/onboarding">Get started</Link></Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
