// Triangle mark used in the header and as a visual element on the homepage.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path d="M12 3 L22 20 L2 20 Z" fill="currentColor" />
    </svg>
  );
}
