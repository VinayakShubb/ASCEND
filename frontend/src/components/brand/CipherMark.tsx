/* A tiny static stand-in for the CIPHER orb, for the nav where an animated
   avatar would be distracting: an outer ring, a core, and two eyes. Draws in
   currentColor so it inherits the nav item's active/inactive colour. */
export function CipherMark({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.3" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {filled && <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.14" />}
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9.9" cy="11.4" r="1.15" fill="currentColor" />
      <circle cx="14.1" cy="11.4" r="1.15" fill="currentColor" />
    </svg>
  );
}
