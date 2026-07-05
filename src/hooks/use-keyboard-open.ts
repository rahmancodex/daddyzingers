import { useEffect, useState } from "react";

/**
 * Returns true when the on-screen (virtual) keyboard is likely open,
 * derived from window.visualViewport height vs. layout height. Falls back
 * to `false` when visualViewport isn't available (desktop, older browsers).
 */
export function useKeyboardOpen(threshold = 150) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      const diff = window.innerHeight - vv.height;
      setOpen(diff > threshold);
    };

    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, [threshold]);

  return open;
}
