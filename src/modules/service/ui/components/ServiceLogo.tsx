'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceLogoProps {
  name: string;
  logoUrl: string | null;
  /** Tailwind size + rounding classes for the wrapper. */
  className?: string;
  iconClassName?: string;
}

/** Service logo with a fallback icon when the URL is empty or the image fails to load. */
export function ServiceLogo({
  name,
  logoUrl,
  className = 'size-10 rounded-[11px]',
  iconClassName = 'size-5',
}: ServiceLogoProps) {
  // Remember which URL failed, so a new URL is retried without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(logoUrl) && failedUrl !== logoUrl;

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground grid shrink-0 place-items-center overflow-hidden border',
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external/public logo URLs
        <img
          src={logoUrl ?? undefined}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : (
        <ImageIcon className={iconClassName} />
      )}
    </span>
  );
}
