'use client';

import { useState, type ComponentProps } from 'react';
import { EyeIcon, LockIcon } from '@/app/(auth)/_components/AuthIcons';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

/** Branded password control with a lock lead icon and a show/hide toggle. */
export function PasswordInput(props: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="ctrl">
      <LockIcon className="lead" />
      <input type={isVisible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="toggle"
        aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setIsVisible((v) => !v)}
      >
        <EyeIcon off={isVisible} />
      </button>
    </div>
  );
}
