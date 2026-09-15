'use client';

import { useState, type FormEvent } from 'react';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TwoFactorPasswordMode } from '../types/Settings';

const COPY: Record<TwoFactorPasswordMode, { title: string; description: string; confirm: string }> = {
  enable: {
    title: 'Confirma tu contraseña',
    description: 'Para activar la autenticación de dos factores, confirma tu contraseña.',
    confirm: 'Continuar',
  },
  disable: {
    title: 'Desactivar autenticación de dos factores',
    description: 'Confirma tu contraseña para desactivar la autenticación de dos factores.',
    confirm: 'Desactivar 2FA',
  },
  regenerate: {
    title: 'Regenerar códigos de recuperación',
    description: 'Los códigos actuales dejarán de funcionar. Confirma tu contraseña para generar nuevos.',
    confirm: 'Regenerar códigos',
  },
};

type Props = {
  mode: TwoFactorPasswordMode | null;
  pending: boolean;
  error: string | null;
  onConfirm: (password: string) => void;
  onClose: () => void;
};

export function TwoFactorPasswordDialog({ mode, pending, error, onConfirm, onClose }: Props) {
  const [password, setPassword] = useState('');
  const copy = COPY[mode ?? 'enable'];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm(password);
    setPassword('');
  };

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPassword('');
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="two_factor_password">Contraseña</Label>
            <Input
              id="two_factor_password"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            <InputError message={error ?? undefined} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={mode === 'disable' ? 'destructive' : 'default'}
              disabled={pending || password.length === 0}
            >
              {pending ? 'Verificando…' : copy.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
