import { useRef, useState, type KeyboardEvent, type ChangeEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  error?: boolean;
}

const CHARSET = /^[A-HJ-NP-Z2-9]$/;

export function RoomCodeInput({ value, onChange, onComplete, error }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [internalError, setInternalError] = useState(false);
  const chars = value.padEnd(6, " ").split("").slice(0, 6);

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    if (raw === "") {
      const next = value.substring(0, i) + value.substring(i + 1);
      onChange(next);
      return;
    }
    const ch = raw[raw.length - 1];
    if (!CHARSET.test(ch)) {
      setInternalError(true);
      setTimeout(() => setInternalError(false), 300);
      return;
    }
    const next = (
      value.padEnd(6, " ").substring(0, i) +
      ch +
      value.padEnd(6, " ").substring(i + 1)
    ).replace(/ +$/, "");
    onChange(next.slice(0, 6));
    if (i < 5) refs.current[i + 1]?.focus();
    if (next.replace(/ /g, "").length === 6 && onComplete) onComplete(next.slice(0, 6));
  };

  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-HJ-NP-Z2-9]/g, "")
      .slice(0, 6);
    onChange(pasted);
    if (pasted.length === 6 && onComplete) onComplete(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const showError = error || internalError;

  return (
    <div className={cn("grid grid-cols-6 gap-2", showError && "animate-pulse")}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={chars[i].trim()}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onPaste={handlePaste}
          maxLength={1}
          inputMode="text"
          autoCapitalize="characters"
          className={cn(
            "aspect-square w-full rounded-lg border bg-white/[0.02] text-center font-mono text-xl uppercase text-white focus:outline-none focus:ring-2 transition-all",
            showError
              ? "border-red-500/60 focus:ring-red-500/40"
              : "border-white/10 focus:border-[#E6B84F] focus:ring-[#E6B84F]/40"
          )}
        />
      ))}
    </div>
  );
}
