'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  allowNegative?: boolean;
}

function clampNumber(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) {
    return min;
  }
  if (max !== undefined && value > max) {
    return max;
  }
  return value;
}

function sanitizeNumeric(raw: string, decimals: number, allowNegative: boolean): string {
  let next = raw.replace(/,/g, '.');
  const isNegative = allowNegative && next.trim().startsWith('-');
  next = next.replace(/[^0-9.]/g, '');

  if (decimals <= 0) {
    next = next.replace(/\./g, '');
  } else {
    const [integerPart, ...rest] = next.split('.');
    next = integerPart ?? '';
    if (rest.length > 0) {
      next += '.' + rest.join('').slice(0, decimals);
    }
  }

  return (isNegative ? '-' : '') + next;
}

/**
 * Input numérico sin las flechas nativas de `type="number"`.
 * Permite escribir libremente mientras el campo está enfocado y aplica
 * el clamp de `min`/`max` al perder el foco.
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  decimals = 0,
  allowNegative = false,
  className,
  inputMode,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const format = React.useCallback(
    (input: number | null | undefined): string => {
      if (input === null || input === undefined || Number.isNaN(input)) {
        return '';
      }
      return decimals > 0 ? String(input) : String(Math.trunc(input));
    },
    [decimals],
  );

  const display = isFocused ? draft : format(value);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(true);
    setDraft(format(value));
    onFocus?.(event);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const next = sanitizeNumeric(event.target.value, decimals, allowNegative);
    setDraft(next);

    if (next === '' || next === '-') {
      onValueChange(min ?? 0);
      return;
    }

    const parsed = parseFloat(next);
    onValueChange(Number.isNaN(parsed) ? (min ?? 0) : parsed);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(false);
    const parsed = parseFloat(draft);
    const base = Number.isNaN(parsed) ? (min ?? 0) : parsed;
    onValueChange(clampNumber(base, min, max));
    onBlur?.(event);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode={inputMode ?? (decimals > 0 ? 'decimal' : 'numeric')}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn('tabular-nums', className)}
    />
  );
}
