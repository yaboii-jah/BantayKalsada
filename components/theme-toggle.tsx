"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Toggle theme">
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";
  const label = isDark ? "Light mode" : "Dark mode";
  const Icon = isDark ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </Button>
  );
}
