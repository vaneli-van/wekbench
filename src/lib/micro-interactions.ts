// Micro-interaction utilities for polish

export function getDragFeedbackClass(isDragging: boolean): string {
  if (!isDragging) return "";
  return "opacity-50 scale-95";
}

export function getDropZoneClass(isDropTarget: boolean): string {
  if (!isDropTarget) return "";
  return "ring-2 ring-primary/50 bg-primary/5";
}

export function getLoadingStateClass(isLoading: boolean): string {
  if (!isLoading) return "";
  return "pointer-events-none opacity-60";
}

export const pulseAnimation = `
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary), 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(var(--color-primary), 0); }
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s infinite;
  }
`;
