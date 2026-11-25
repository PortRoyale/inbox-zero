import { site } from "@/lib/site";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 3 6v6c0 5 3.8 9.3 9 10 5.2-.7 9-5 9-10V6l-9-4Z" fill="var(--color-brand)" />
        <path d="m8 12.5 2.7 2.7L16.5 9" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {site.name}
    </span>
  );
}
