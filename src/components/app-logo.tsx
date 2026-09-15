import { Sparkles } from 'lucide-react';

export function AppLogo() {
  return (
    <>
      <div
        className="flex aspect-square size-8 items-center justify-center rounded-[11px] text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
        style={{
          background: 'linear-gradient(135deg, #5b54ec, #3f8bff)',
        }}
      >
        <Sparkles className="size-4.5" />
      </div>
      <div className="ml-1 grid flex-1 text-left">
        <span className="text-sidebar-accent-foreground truncate text-base leading-tight font-semibold tracking-tight">
          Stream<b className="font-extrabold">CRM</b>
        </span>
      </div>
    </>
  );
}

export default AppLogo;
