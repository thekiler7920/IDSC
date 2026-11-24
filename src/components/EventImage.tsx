import { useState } from 'react';
import { Cpu } from 'lucide-react';
import type { EventImageKey } from '../types/campus';
import { IMAGE_KEY_MAP } from '../utils/validation';

interface EventImageProps {
  imageKey: EventImageKey;
  alt: string;
  className?: string;
}

export function EventImage({ imageKey, alt, className = '' }: EventImageProps) {
  const [failed, setFailed] = useState(false);
  const asset = IMAGE_KEY_MAP[imageKey] ?? IMAGE_KEY_MAP.hackathon;

  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 flex flex-col items-center justify-center text-slate-200 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Cpu className="w-8 h-8 text-blue-300 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-300 text-center">{asset.label}</span>
      </div>
    );
  }

  return (
    <img
      src={asset.src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
