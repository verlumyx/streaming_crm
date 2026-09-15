import type { Metadata } from 'next';
import Link from 'next/link';
import { StreamCrmLogo } from '@/components/streamcrm-logo';
import { getSessionUser } from '@/modules/shared/auth/session';
import { leadRoutes } from '@/modules/lead/routes';
import { WelcomeNav } from '@/app/_welcome/WelcomeNav';

export const metadata: Metadata = {
  title: { absolute: 'StreamCRM — El CRM para revendedores de cuentas de streaming' },
};

/** Public landing (`/` is public in `src/proxy.ts`). A visitor with a session gets "Ir al panel" instead of the login. */
export default async function HomePage() {
  const user = await getSessionUser();
  const panelHref = user ? '/dashboard' : '/login';
  const panelLabel = user ? 'Ir al panel' : 'Iniciar sesión';
  const contactHref = leadRoutes.contact();

  return (
    <>
      {/* Page-scoped stylesheet of the public site (rendered in place, removed when leaving the page). */}
      <link rel="stylesheet" href="/css/site.css" />

      <WelcomeNav panelHref={panelHref} panelLabel={panelLabel} contactHref={contactHref} />

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="pill">
              <span className="dot" /> Hecho para revendedores de streaming
            </span>
            <h1>
              Vende cuentas de streaming <span className="grad">sin perder el control.</span>
            </h1>
            <p className="lead">
              StreamCRM reúne tus clientes, perfiles, vencimientos y cobros en un solo panel. Sabe quién paga,
              quién debe y qué perfil vence — antes de que te escriban.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-brand btn-lg" href={contactHref}>
                Contáctenos
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a className="btn btn-ghost btn-lg" href="#funciones">
                Ver funciones
              </a>
            </div>
            <div className="hero-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>{' '}
              Sin tarjeta · Configúralo en 5 minutos
            </div>
          </div>
          <div className="hero-media">
            <div className="shot">
              <div className="shot-bar">
                <i />
                <i />
                <i />
                <span className="shot-url">app.streamcrm.cl/resumen</span>
              </div>
              <img src="/assets/hero-dashboard.png" alt="Panel de StreamCRM" />
            </div>
            <div className="hero-float a">
              <span className="float-ico t-green">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 17 6-6 4 4 8-8" />
                  <path d="M15 7h6v6" />
                </svg>
              </span>
              <div>
                <div className="float-k">Ganancia de mayo</div>
                <div className="float-v">$241.000</div>
              </div>
            </div>
            <div className="hero-float b">
              <span className="float-ico t-amber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              </span>
              <div>
                <div className="float-k">Por vencer</div>
                <div className="float-v">3 perfiles</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM STRIP */}
      <section className="strip" id="plataformas">
        <div className="wrap">
          <p className="strip-label">Gestiona perfiles y cuentas de todas las plataformas</p>
          <div className="strip-row">
            <span className="plat-tag">
              <span className="sq" style={{ background: '#e50914' }}>
                N
              </span>{' '}
              Netflix
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#1942d6' }}>
                D+
              </span>{' '}
              Disney+
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#6b21d6' }}>
                M
              </span>{' '}
              Max
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#1aa64b' }}>
                S
              </span>{' '}
              Spotify
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#00a8e1' }}>
                P
              </span>{' '}
              Prime Video
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#f01616' }}>
                YT
              </span>{' '}
              YouTube Premium
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#f47521' }}>
                CR
              </span>{' '}
              Crunchyroll
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#1c1c1e' }}>
                TV
              </span>{' '}
              Apple TV+
            </span>
            <span className="plat-tag">
              <span className="sq" style={{ background: '#0064ff' }}>
                P+
              </span>{' '}
              Paramount+
            </span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="funciones">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Todo en un lugar</span>
            <h2>Deja la libreta y los chats desordenados</h2>
            <p>
              Las herramientas que un revendedor necesita de verdad — sin planillas interminables ni
              recordatorios olvidados.
            </p>
          </div>
          <div className="feat-grid">
            <div className="feat">
              <div className="feat-ico t-amber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                  <path d="M3 9h18M8 2.5v4M16 2.5v4" />
                </svg>
              </div>
              <h3>Control de vencimientos</h3>
              <p>
                Cada perfil con su fecha. Mira de un vistazo lo que vence hoy, esta semana o lo que ya caducó.
              </p>
            </div>
            <div className="feat">
              <div className="feat-ico t-green">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
                  <path d="M2.5 10h19" />
                </svg>
              </div>
              <h3>Cobros y deuda</h3>
              <p>
                Registra cada pago y mira al instante quién está al día y quién te debe, con el total por
                cobrar.
              </p>
            </div>
            <div className="feat">
              <div className="feat-ico t-blue">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="8" height="8" rx="2" />
                  <rect x="13" y="3" width="8" height="8" rx="2" />
                  <rect x="3" y="13" width="8" height="8" rx="2" />
                  <rect x="13" y="13" width="8" height="8" rx="2" />
                </svg>
              </div>
              <h3>Perfiles libres vs. ocupados</h3>
              <p>
                Sabe cuántos cupos tienes disponibles por cuenta y vende sin sobrevender ni dejar plata sobre
                la mesa.
              </p>
            </div>
            <div className="feat">
              <div className="feat-ico t-teal">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3L3 21Z" />
                </svg>
              </div>
              <h3>Recordatorios por WhatsApp</h3>
              <p>
                Avisa vencimientos y cobra con un clic. El mensaje se abre listo con el número del cliente.
              </p>
            </div>
            <div className="feat">
              <div className="feat-ico t-indigo">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 17 6-6 4 4 8-8" />
                  <path d="M15 7h6v6" />
                </svg>
              </div>
              <h3>Ganancia y márgenes</h3>
              <p>
                Costo de la cuenta vs. precio de venta. Conoce tu ganancia real mes a mes, no solo lo que
                entra.
              </p>
            </div>
            <div className="feat">
              <div className="feat-ico t-pink">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                  <path d="m3 12 9 5 9-5" />
                  <path d="m3 17 9 5 9-5" />
                </svg>
              </div>
              <h3>Multi-plataforma y multi-empresa</h3>
              <p>
                Netflix, Disney+, Spotify y más, en una misma vista. Maneja varias marcas o socios por
                separado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE 1 */}
      <section className="section soft">
        <div className="wrap">
          <div className="showcase">
            <div className="showcase-copy">
              <span className="eyebrow">Panel de control</span>
              <h2>Tu negocio completo, de un vistazo</h2>
              <p>
                Ingresos, ganancia, ocupación de perfiles y lo que está por vencer — todo en la primera
                pantalla. Empieza el día sabiendo exactamente qué hacer.
              </p>
              <ul className="check-list">
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Ingresos y ganancia del mes con tendencia
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Ocupación de perfiles e inventario disponible
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Próximos vencimientos y cuentas por cobrar
                </li>
              </ul>
              <div style={{ marginTop: 28 }}>
                <Link className="btn btn-brand" href={panelHref}>
                  Probar el panel
                </Link>
              </div>
            </div>
            <div className="showcase-media">
              <div className="shot">
                <div className="shot-bar">
                  <i />
                  <i />
                  <i />
                  <span className="shot-url">app.streamcrm.cl/resumen</span>
                </div>
                <img src="/assets/hero-dashboard.png" alt="Panel resumen" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE 2 */}
      <section className="section">
        <div className="wrap">
          <div className="showcase flip">
            <div className="showcase-copy">
              <span className="eyebrow">Clientes</span>
              <h2>Cada cliente, perfil y pago en un solo lugar</h2>
              <p>
                Busca, filtra y abre la ficha de cualquier cliente: sus perfiles activos, historial de pagos,
                deuda y contacto directo por WhatsApp.
              </p>
              <ul className="check-list">
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Ficha completa con perfiles e historial
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Filtros por estado, plataforma y deuda
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Renovar o avisar al cliente en un clic
                </li>
              </ul>
              <div style={{ marginTop: 28 }}>
                <Link className="btn btn-ghost" href={panelHref}>
                  Ver clientes
                </Link>
              </div>
            </div>
            <div className="showcase-media">
              <div className="shot">
                <div className="shot-bar">
                  <i />
                  <i />
                  <i />
                  <span className="shot-url">app.streamcrm.cl/clientes</span>
                </div>
                <img src="/assets/shot-clientes.png" alt="Lista de clientes" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS BAND */}
      <section className="section" id="empresa">
        <div className="wrap">
          <div className="band">
            <div className="band-grid">
              <div className="band-stat">
                <div className="bn">+12.000</div>
                <div className="bl">Perfiles gestionados con StreamCRM</div>
              </div>
              <div className="band-stat">
                <div className="bn">9</div>
                <div className="bl">Plataformas de streaming soportadas</div>
              </div>
              <div className="band-stat">
                <div className="bn">98%</div>
                <div className="bl">Renovaciones avisadas a tiempo</div>
              </div>
              <div className="band-stat">
                <div className="bn">−70%</div>
                <div className="bl">Menos tiempo perdido en cobranzas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section soft" id="precios">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Precios</span>
            <h2>Empieza gratis, crece cuando vendas más</h2>
            <p>Sin contratos ni sorpresas. Cambia o cancela tu plan cuando quieras.</p>
          </div>
          <div className="price-grid">
            <div className="price">
              <h3>Inicial</h3>
              <p className="desc">Para quien recién empieza a revender.</p>
              <div className="amt">
                $0<small> /mes</small>
              </div>
              <ul>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Hasta 25 clientes
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Control de vencimientos
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  1 usuario
                </li>
              </ul>
              <Link className="btn btn-ghost btn-block" href={contactHref}>
                Contáctenos
              </Link>
            </div>
            <div className="price feat-plan">
              <span className="price-tag">Más popular</span>
              <h3>Pro</h3>
              <p className="desc">Para el revendedor que ya tiene cartera.</p>
              <div className="amt">
                $12.990<small> /mes</small>
              </div>
              <ul>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Clientes y perfiles ilimitados
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Recordatorios por WhatsApp
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Reportes de ganancia
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Hasta 3 usuarios
                </li>
              </ul>
              <Link className="btn btn-brand btn-block" href={panelHref}>
                Empezar con Pro
              </Link>
            </div>
            <div className="price">
              <h3>Negocio</h3>
              <p className="desc">Para equipos y varias marcas.</p>
              <div className="amt">
                $24.990<small> /mes</small>
              </div>
              <ul>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Todo lo de Pro
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Multi-empresa y roles
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Usuarios ilimitados
                </li>
                <li>
                  <span className="ck">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>{' '}
                  Soporte prioritario
                </li>
              </ul>
              <Link className="btn btn-ghost btn-block" href={panelHref}>
                Hablar con ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta-card">
            <h2>Empieza a vender con orden hoy</h2>
            <p>Crea tu cuenta gratis y ten tu primer cliente cargado en minutos.</p>
            <div className="cta-actions">
              <Link className="btn btn-light btn-lg" href={contactHref}>
                Contáctenos
              </Link>
              <Link className="btn btn-ghost btn-lg" href={panelHref}>
                {panelLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-about">
              <Link className="logo" href="/">
                <StreamCrmLogo simple />
              </Link>
              <p>El CRM hecho para revendedores de cuentas y perfiles de streaming.</p>
            </div>
            <div className="foot-col">
              <h4>Producto</h4>
              <a href="#funciones">Funciones</a>
              <a href="#precios">Precios</a>
              <a href="#plataformas">Plataformas</a>
              <a href="#funciones">Ver demo</a>
            </div>
            <div className="foot-col">
              <h4>Recursos</h4>
              <a href="#">Guía de inicio</a>
              <a href="#">Centro de ayuda</a>
              <a href="#">Novedades</a>
            </div>
            <div className="foot-col">
              <h4>Empresa</h4>
              <a href="#">Sobre nosotros</a>
              <a href="#">Contacto</a>
              <a href="#">Términos y privacidad</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 StreamCRM. Todos los derechos reservados.</span>
            <span>Hecho para vendedores independientes 💜</span>
          </div>
        </div>
      </footer>
    </>
  );
}
