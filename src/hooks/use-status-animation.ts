import { useState, useCallback } from "react";

export function useStatusAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);
  }, []);

  return { isAnimating, animate };
}
