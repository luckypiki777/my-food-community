import { useEffect, useState } from "react";

function rgbToHex(rgb: string): string {
  const nums = rgb.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length < 3) return rgb;
  const [r, g, b] = nums.slice(0, 3).map((v) => Math.round(Number(v)));
  return (
    "#" +
    [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  ).toUpperCase();
}

/**
 * Resolves a list of CSS custom properties (e.g. "--color-brand-500") to their
 * computed hex values at runtime, so foundation stories stay in sync with the
 * single source of truth in globals.css instead of duplicating hex literals.
 */
export function useTokenHex(cssVars: string[]): Record<string, string> {
  const [hex, setHex] = useState<Record<string, string>>({});
  const key = cssVars.join("|");

  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;";
    document.body.appendChild(probe);

    const out: Record<string, string> = {};
    for (const v of cssVars) {
      probe.style.color = "";
      probe.style.color = `var(${v})`;
      const computed = getComputedStyle(probe).color;
      out[v] = computed ? rgbToHex(computed) : "";
    }

    probe.remove();
    setHex(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return hex;
}
