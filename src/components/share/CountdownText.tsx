import { useEffect, useState } from 'react';
import { formatCountdown } from '../../shared/formatters.ts';

interface CountdownTextProps {
  expiresAt: number;
  className?: string;
}

export function CountdownText({ expiresAt, className = '' }: CountdownTextProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const info = formatCountdown(expiresAt, now);

  return (
    <span className={`tabular-nums ${info.expired ? 'text-red-300 font-medium' : ''} ${className}`}>
      {info.label}
    </span>
  );
}
