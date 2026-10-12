import { LoaderCircle } from 'lucide-react';

export default function Spinner({ className = 'size-5', label }) {
  return (
    <>
      <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
