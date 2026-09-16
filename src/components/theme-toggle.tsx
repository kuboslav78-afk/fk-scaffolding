"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
    >
      <span>{isDark ? "Tmavý režim" : "Svetlý režim"}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
          isDark ? "bg-ink-200" : "bg-brand-500"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform duration-150 ${
            isDark ? "translate-x-0.5 bg-ink-500" : "translate-x-[18px] bg-white"
          }`}
        />
      </span>
    </button>
  );
}
