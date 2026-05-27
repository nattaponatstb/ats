"use client";

import { useEffect } from "react";
import { applyTheme, DEFAULT_THEME_ID } from "@/lib/themes";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("themeId") ?? DEFAULT_THEME_ID;
    applyTheme(saved);
  }, []);

  return <>{children}</>;
}
