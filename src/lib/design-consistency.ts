// Design Consistency Guide - Apply these patterns throughout the app

export const designPatterns = {
  // Page layouts
  pageWrapper: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8",
  pageContent: "space-y-8",
  
  // Sections
  section: "space-y-4",
  sectionTitle: "text-2xl font-semibold text-foreground",
  sectionDescription: "text-muted-foreground",
  
  // Cards & containers
  card: "rounded-lg border border-border bg-card p-6 shadow-sm",
  cardHover: "hover:shadow-md transition-shadow",
  
  // Grids
  gridCols: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
  gridRows: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  
  // Forms
  formGroup: "space-y-2",
  formLabel: "text-sm font-semibold text-foreground",
  formInput: "rounded-md border border-input bg-background px-3 py-2 text-sm",
  
  // Text
  h1: "text-3xl font-bold text-foreground",
  h2: "text-2xl font-semibold text-foreground",
  h3: "text-lg font-semibold text-foreground",
  
  // Lists
  listItem: "flex items-center gap-3 py-2",
  badge: "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
};

export function applyDesignPattern(pattern: keyof typeof designPatterns): string {
  return designPatterns[pattern];
}
