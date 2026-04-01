"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function Combobox({ value, onChange, options, placeholder = "เลือกหรือพิมพ์...", className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setInputValue(value); }, [value]);

  const filtered = options.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()));

  function handleInput(v: string) {
    setInputValue(v);
    onChange(v);
    setOpen(true);
  }

  function select(v: string) {
    setInputValue(v);
    onChange(v);
    setOpen(false);
  }

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <Check className={cn("h-4 w-4 shrink-0", value === opt ? "opacity-100" : "opacity-0")} />
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
