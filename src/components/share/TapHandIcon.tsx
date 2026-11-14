interface TapHandIconProps {
  className?: string;
}

export function TapHandIcon({ className = 'h-6 w-6' }: TapHandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.5 3.5a1.25 1.25 0 0 1 2.5 0v6.25h.6a1.4 1.4 0 0 1 1.4 1.4v.35h.55a1.35 1.35 0 0 1 1.35 1.35v.4h.45a1.3 1.3 0 0 1 1.3 1.3v3.35c0 2.55-1.95 4.6-4.5 4.6H11.2c-1.7 0-3.25-.92-4.08-2.4l-2.32-4.15a1.25 1.25 0 0 1 2.02-1.44L8.5 16.3V4.75c0-.69.45-1.25 1-1.25Z" />
    </svg>
  );
}
