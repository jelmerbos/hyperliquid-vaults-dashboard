export function HLLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hyperliquid bowtie logo */}
      <path
        d="M20 2C16 2 13 5.5 10 8.5C7 11.5 4 14 0 14C4 14 7 17.5 10 20.5C13 17.5 16 14 20 14C16 14 13 17.5 10 20.5C7 17.5 4 14 0 14"
        fill="currentColor"
        opacity="0"
      />
      {/* Left lobe */}
      <ellipse cx="11" cy="12" rx="9" ry="8" fill="currentColor" opacity="0.9" />
      {/* Right lobe */}
      <ellipse cx="29" cy="12" rx="9" ry="8" fill="currentColor" opacity="0.9" />
      {/* Center pinch (subtract) */}
      <ellipse cx="20" cy="12" rx="6" ry="10" fill="var(--background)" />
      {/* Reconnect outer edges */}
      <path
        d="M14 4.5C16.5 7 18 9.5 18 12C18 14.5 16.5 17 14 19.5C16 18 18 15.5 20 12C18 8.5 16 6 14 4.5Z"
        fill="currentColor"
      />
      <path
        d="M26 4.5C23.5 7 22 9.5 22 12C22 14.5 23.5 17 26 19.5C24 18 22 15.5 20 12C22 8.5 24 6 26 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
