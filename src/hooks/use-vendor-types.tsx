import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyWorkspace, type VendorType } from "@/lib/api/workspace.functions";

export const VENDOR_TYPE_LABEL: Record<VendorType, string> = {
  distributor: "Authorised Distributor",
  system_integrator: "System Integrator",
  vendor: "General Vendor",
};

export const VENDOR_TYPE_DESCRIPTION: Record<VendorType, string> = {
  distributor:
    "Authorised reseller for one or more OEMs. Holds stock, sells at margin, ships from local inventory.",
  system_integrator:
    "Bundles hardware + services into projects. Multi-OEM BOMs, installation, training, longer cycles.",
  vendor:
    "General supplier or trader. Mixed sourcing, varied product mix, no formal OEM authorisation.",
};

export function useVendorTypes() {
  const fn = useServerFn(getMyWorkspace);
  const q = useQuery({
    queryKey: ["my-workspace"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  const types: VendorType[] = (q.data?.workspace?.vendor_types ?? []) as VendorType[];
  return {
    types,
    has: (t: VendorType) => types.includes(t),
    hasAny: (...ts: VendorType[]) => ts.some((t) => types.includes(t)),
    isDistributor: types.includes("distributor"),
    isSI: types.includes("system_integrator"),
    isVendor: types.includes("vendor"),
    needsSetup: q.isSuccess && types.length === 0,
    isLoading: q.isLoading,
    workspace: q.data?.workspace,
  };
}
