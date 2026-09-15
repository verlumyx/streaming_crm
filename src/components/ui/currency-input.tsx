'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  currencySymbol?: string;
  locale?: string;
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

function sanitizeNumeric(raw: string, decimals: number): string {
  let next = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');

  if (decimals <= 0) {
    return next.replace(/\./g, '');
  }

  const [integerPart, ...rest] = next.split('.');
  next = integerPart ?? '';
  if (rest.length > 0) {
    next += '.' + rest.join('').slice(0, decimals);
  }
  return next;
}

/**
 * Input de moneda con separador de miles y símbolo (`$` por defecto).
 * Muestra el valor formateado cuando no está enfocado y permite editar el
 * número plano mientras se escribe; aplica clamp de `min`/`max` al salir.
 */
export function CurrencyInput({
  value,
  onValueChange,
  min = 0,
  max,
  decimals = 0,
  currencySymbol = '$',
  locale = 'es-CL',
  className,
  onFocus,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const formatGrouped = React.useCallback(
    (input: number | null | undefined): string => {
      if (input === null || input === undefined || Number.isNaN(input)) {
        return '';
      }
      return input.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    [locale, decimals],
  );

  const formatPlain = (input: number | null | undefined): string => {
    if (input === null || input === undefined || Number.isNaN(input)) {
      return '';
    }
    return decimals > 0 ? String(input) : String(Math.trunc(input));
  };

  const display = isFocused ? draft : formatGrouped(value);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(true);
    setDraft(formatPlain(value));
    onFocus?.(event);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const next = sanitizeNumeric(event.target.value, decimals);
    setDraft(next);

    if (next === '') {
      onValueChange(min);
      return;
    }

    const parsed = parseFloat(next);
    onValueChange(Number.isNaN(parsed) ? min : parsed);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    setIsFocused(false);
    const parsed = parseFloat(draft);
    const base = Number.isNaN(parsed) ? min : parsed;
    onValueChange(clampNumber(base, min, max));
    onBlur?.(event);
  };

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold select-none">
        {currencySymbol}
      </span>
      <Input
        {...props}
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn('pl-7 text-right tabular-nums', className)}
      />
    </div>
  );
}
