import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';

export function AlertError({ errors, title }: { errors: string[]; title?: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title || 'Algo salió mal.'}</AlertTitle>
      <AlertDescription>
        <ul className="list-inside list-disc text-sm">
          {Array.from(new Set(errors)).map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default AlertError;
