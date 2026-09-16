'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Encabezado del grupo; las opciones con el mismo `group` se muestran juntas bajo ese título. */
  group?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearable?: boolean;
  disabled?: boolean;
  /** Si se indica, se renderiza un `<input type="hidden">` para enviar el valor en un `<form>`. */
  name?: string;
  id?: string;
  className?: string;
  /** Clases del desplegable (por defecto toma el ancho del disparador). */
  contentClassName?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Combobox con búsqueda (reemplazo de `Select2`/react-select) construido sobre
 * shadcn `Popover` + `Command`.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No hay opciones disponibles',
  clearable = false,
  disabled = false,
  name,
  id,
  className,
  contentClassName,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const groups = React.useMemo(() => {
    const byHeading = new Map<string | undefined, SearchableSelectOption[]>();
    for (const option of options)
      byHeading.set(option.group, [...(byHeading.get(option.group) ?? []), option]);
    return [...byHeading.entries()];
  }, [options]);

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between px-3 font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled && (
              <span
                role="button"
                aria-label="Limpiar selección"
                tabIndex={-1}
                onClick={handleClear}
                className="text-muted-foreground rounded-sm opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-(--radix-popover-trigger-width) p-0', contentClassName)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map(([heading, groupOptions]) => (
              <CommandGroup key={heading ?? ''} heading={heading}>
                {groupOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <CommandItem
                      key={`${option.value} ${option.label}`}
                      value={`${option.label} ${option.value}`}
                      data-checked={isSelected}
                      onSelect={() => {
                        onChange(isSelected && clearable ? null : option.value);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
