import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in — wekbench" }] }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center"><Wordmark size="lg" /></div>
        <h1 className="mt-6 text-center text-xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Sign in to your workspace
        </p>
        <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="you@company.com"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="password"
            placeholder="Password"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <Button asChild className="mt-1"><Link to="/dashboard">Sign in</Link></Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to wekbench?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
