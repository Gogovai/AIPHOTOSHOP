"use client";

/**
 * One button on the tool rail. Owns the shared "which tool is active" state so
 * the rail reads as one control; no tool behavior is implemented (Milestone
 * 002 is a shell). Selection is visual shell state only and never enters a
 * document (AGENT_RULES 4).
 */
import { useState } from "react";

interface ToolButtonProps {
  readonly label: string;
  readonly icon: React.ReactNode;
}

export function ToolButton({ label, icon }: ToolButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={() => setActive((value) => !value)}
      className={`flex size-9 items-center justify-center border transition-colors focus-visible:outline-2 ${
        active
          ? "border-canvas-line bg-canvas-ink/10 text-canvas-ink"
          : "border-transparent text-canvas-muted hover:border-canvas-line hover:text-canvas-ink"
      }`}
    >
      {icon}
    </button>
  );
}
