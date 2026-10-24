'use client';

import { useEffect, useState } from 'react';

/** Number field that only commits on blur or Enter, so typing "2" on the way to "2400" doesn't rebuild everything. */
export function NumInput({ value, onCommit, step, min, className = 'inp sm num', width, disabled, label }: { value: number; onCommit: (v: number) => void; step?: number; min?: number; className?: string; width?: number; disabled?: boolean; label?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = parseFloat(v);
    if (Number.isFinite(n) && n !== value && (min == null || n >= min)) onCommit(n);
    else setV(String(value));
  };
  return (
    <input
      className={className}
      style={width ? { width } : undefined}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={v}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setV(String(value));
      }}
    />
  );
}

export function TextInput({ value, onCommit, className = 'inp sm', placeholder }: { value: string; onCommit: (v: string) => void; className?: string; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={className}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
