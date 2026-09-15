'use client';

import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/phone';

interface WhatsAppButtonProps {
  tel: string;
  label?: string;
  size?: 'sm' | 'md';
}

/** Botón de acción rápida de WhatsApp (verde suave, diseño StreamCRM). */
export function WhatsAppButton({ tel, label = 'Enviar WhatsApp', size = 'md' }: WhatsAppButtonProps) {
  return (
    <a
      className={`border-wa/25 bg-wa/15 hover:bg-wa/25 grid place-items-center rounded-[10px] border text-[#1ba94f] transition-colors ${
        size === 'sm' ? 'size-[33px]' : 'size-9'
      }`}
      href={whatsappUrl(tel)}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className={size === 'sm' ? 'size-[15px]' : 'size-4'} />
    </a>
  );
}

interface WhatsAppActionProps {
  tel: string;
  children?: string;
  size?: 'sm' | 'md';
}

/** Botón sólido de WhatsApp con texto (para la ficha del cliente). */
export function WhatsAppAction({ tel, children = 'WhatsApp', size = 'md' }: WhatsAppActionProps) {
  return (
    <a
      className={`bg-wa inline-flex items-center gap-2 rounded-xl font-semibold text-white shadow-[0_4px_12px_rgba(37,211,102,.28)] transition-colors hover:bg-[#1eb958] ${
        size === 'sm' ? 'h-[33px] px-3 text-[13px]' : 'h-10 px-4 text-sm'
      }`}
      href={whatsappUrl(tel)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle className={size === 'sm' ? 'size-3.5' : 'size-[17px]'} />
      {children}
    </a>
  );
}
