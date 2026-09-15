import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportFilterActions({ pending, onSearch, onClear }: { pending: boolean; onSearch: () => void; onClear: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button onClick={onSearch} disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
        {pending ? 'Buscando…' : 'Buscar'}
      </Button>
      <Button variant="outline" onClick={onClear} disabled={pending}>
        Limpiar
      </Button>
    </div>
  );
}
