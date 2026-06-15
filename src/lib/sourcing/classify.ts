// Deterministic line-item classification — NO AI, runs free on every line.
// This is the credit-saving pre-filter from the sourcing plan: obvious lines are
// categorized by keyword/pattern here; only genuinely ambiguous lines should be
// escalated to an AI pass later.

export type SourcingCategory =
  | "electronic_component"
  | "it_hardware"
  | "electrical"
  | "industrial_mechanical"
  | "other";

export type ClassifiedItem = {
  category: SourcingCategory;
  mpn?: string;
  manufacturer?: string;
};

export type ClassifyInput = {
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
};

// Keyword tables, checked in priority order.
const KEYWORDS: Array<{ category: SourcingCategory; words: string[] }> = [
  {
    category: "it_hardware",
    words: [
      "laptop", "notebook", "desktop", "workstation", "server", "switch", "router",
      "firewall", "access point", "ssd", "hdd", "hard drive", "ram", "memory module",
      "monitor", "ups", "printer", "scanner", "gpu", "graphics card", "docking",
      "dell", "hp", "hpe", "lenovo", "cisco", "juniper", "netgear", "ubiquiti",
      "aruba", "fortinet", "apc", "synology",
    ],
  },
  {
    category: "industrial_mechanical",
    words: [
      "valve", "gauge", "pump", "bearing", "gasket", "flange", "fitting", "actuator",
      "hose", "coupling", "seal", "manifold", "pneumatic", "hydraulic", "compressor",
      "regulator valve", "ball valve", "gate valve",
    ],
  },
  {
    category: "electrical",
    words: [
      "cable", "wire", "breaker", "contactor", "conduit", "socket", "switchgear",
      "transformer", "busbar", "circuit breaker", "distribution board", "mcb", "rcd",
      "junction box", "earthing", "cable gland",
    ],
  },
  {
    category: "electronic_component",
    words: [
      "resistor", "capacitor", "transistor", "diode", "mosfet", "microcontroller",
      "mcu", "regulator", "connector", "sensor", "led", "crystal", "oscillator",
      "inductor", "relay", "amplifier", "ic ", "integrated circuit", "ferrite",
      "potentiometer", "optocoupler",
    ],
  },
];

// A loose MPN heuristic: alphanumeric token that contains BOTH a letter and a
// digit (so "NE555P" / "ACS770ECB-200U-PFF-T" match, but "5440" and "Latitude"
// don't), no spaces, 4–40 chars, may include dashes/dots/slashes.
const MPN_RE = /^[A-Za-z0-9][A-Za-z0-9._/+-]{3,39}$/;
function looksLikeMpn(s: string): boolean {
  const t = s.trim();
  return MPN_RE.test(t) && /[A-Za-z]/.test(t) && /\d/.test(t) && !/\s/.test(t);
}

export function classifyItem(input: ClassifyInput): ClassifiedItem {
  const haystack = [input.description, input.brand, input.model]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let category: SourcingCategory = "other";
  for (const group of KEYWORDS) {
    if (group.words.some((w) => haystack.includes(w))) {
      category = group.category;
      break;
    }
  }

  // MPN resolution: explicit mpn wins; else a model that looks like an MPN;
  // else the first MPN-looking token inside the description.
  let mpn: string | undefined = input.mpn?.trim() || undefined;
  if (!mpn && input.model && looksLikeMpn(input.model)) {
    mpn = input.model.trim();
  }
  if (!mpn && input.description) {
    const tok = input.description.split(/[\s,;]+/).find((w) => looksLikeMpn(w));
    if (tok) mpn = tok;
  }

  // If we still don't have a category but we DO have an MPN, lean electronics —
  // that's the most MPN-driven category and our primary provider (Nexar).
  if (category === "other" && mpn) category = "electronic_component";

  return {
    category,
    mpn,
    manufacturer: input.brand?.trim() || undefined,
  };
}
