/**
 * StreamCRM brand lockup used across the public site (landing + auth).
 * `simple` renders only the primary spark glyph (used inside compact spots);
 * the default renders the spark + secondary sparkle as in the brand panel.
 * Las clases `logo-mark` / `logo-txt` vienen de `public/css/site.css`.
 */
export function StreamCrmLogo({ simple = false }: { simple?: boolean }) {
  return (
    <>
      <span className="logo-mark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3L12 3Z" />
          {!simple && <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />}
        </svg>
      </span>
      <span className="logo-txt">
        Stream<b>CRM</b>
      </span>
    </>
  );
}

export default StreamCrmLogo;
