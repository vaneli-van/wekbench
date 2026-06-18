import { useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { requestUpgrade } from "@/lib/api/workspace.functions"
import { FEATURE_COPY, type UpgradeFeature } from "@/lib/plans"

/**
 * Reusable paywall. Pass the feature that triggered it (null = closed). On
 * "Upgrade to Pro" it records an upgrade request (no payment handled in-app yet).
 * Shared by every gate (quotes, seats, sourcing, AR).
 */
export function UpgradeDialog({
  feature,
  onOpenChange,
}: {
  feature: UpgradeFeature | null
  onOpenChange: (open: boolean) => void
}) {
  const requestUpgradeFn = useServerFn(requestUpgrade)
  const [pending, setPending] = useState(false)
  const copy = feature ? FEATURE_COPY[feature] : null

  return (
    <Dialog open={!!feature} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{copy?.title ?? "Upgrade to Pro"}</DialogTitle>
          <DialogDescription>{copy?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true)
              try {
                await requestUpgradeFn({ data: { feature: feature ?? undefined } })
                toast.success("Thanks — we'll reach out about Pro.")
                onOpenChange(false)
              } catch {
                toast.error("Could not send your request. Please try again.")
              } finally {
                setPending(false)
              }
            }}
          >
            {pending ? "Sending…" : "Upgrade to Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
