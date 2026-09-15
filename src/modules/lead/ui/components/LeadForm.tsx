'use client';

import { COUNTRY_CODES, joinPhone } from '@/lib/phone';
import { LEAD_HONEYPOT_FIELD } from '@/modules/lead/validation/create-lead.schema';
import { useLeadFormContext } from '../contexts/LeadFormContext';

/** Branded contact form (classes from `public/css/site.css`). */
export function LeadForm() {
  const { data, setData, formAction, pending, errors } = useLeadFormContext();

  return (
    <form action={formAction} className="form" noValidate>
      <input type="hidden" name="phone" value={joinPhone(data.phonePrefix, data.phone)} />

      {/* Honeypot: invisible to people, tempting for bots. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label htmlFor={LEAD_HONEYPOT_FIELD}>No completar este campo</label>
        <input
          id={LEAD_HONEYPOT_FIELD}
          type="text"
          name={LEAD_HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className={errors.name ? 'fld invalid' : 'fld'}>
        <label htmlFor="name">Nombre</label>
        <div className="ctrl">
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Tu nombre"
            autoComplete="name"
            autoFocus
            required
            maxLength={255}
            value={data.name}
            onChange={(e) => setData('name', e.target.value)}
          />
        </div>
        <span className="err">{errors.name?.[0] ?? 'Ingresa tu nombre'}</span>
      </div>

      <div className={errors.email ? 'fld invalid' : 'fld'}>
        <label htmlFor="email">Correo electrónico</label>
        <div className="ctrl">
          <input
            id="email"
            type="email"
            name="email"
            placeholder="tu@correo.com"
            autoComplete="email"
            required
            maxLength={255}
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
          />
        </div>
        <span className="err">{errors.email?.[0] ?? 'Ingresa un correo válido'}</span>
      </div>

      <div className={errors.phone ? 'fld invalid' : 'fld'}>
        <label htmlFor="phone-number">Teléfono</label>
        <div className="ctrl" style={{ gap: 10 }}>
          <select
            value={data.phonePrefix}
            onChange={(e) => setData('phonePrefix', e.target.value)}
            aria-label="Prefijo de país"
            style={{
              flex: '0 0 auto',
              height: 50,
              borderRadius: 12,
              border: '1.5px solid var(--border-2)',
              background: 'transparent',
              padding: '0 10px',
              fontSize: 15,
            }}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.name} value={c.dial}>
                {c.name} ({c.dial})
              </option>
            ))}
          </select>
          <input
            id="phone-number"
            type="tel"
            placeholder="412 1234567"
            autoComplete="tel-national"
            required
            maxLength={20}
            value={data.phone}
            onChange={(e) => setData('phone', e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
        <span className="err">{errors.phone?.[0] ?? 'Ingresa tu teléfono'}</span>
      </div>

      <button type="submit" className="btn btn-brand btn-block btn-lg" disabled={pending}>
        {pending && <span className="spin" />}
        {pending ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  );
}
