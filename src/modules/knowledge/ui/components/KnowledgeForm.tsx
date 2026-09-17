'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import { useKnowledgeFormContext } from '../contexts/KnowledgeFormContext';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function KnowledgeForm() {
  const router = useRouter();
  const { mode, data, setData, formAction, pending, errors } = useKnowledgeFormContext();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <FormSectionHead step={1} title="Documento" sub="Lo que el asistente podrá citar al responder" />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-[13px] font-semibold">
              Título *
            </Label>
            <Input
              id="title"
              name="title"
              value={data.title}
              onChange={(e) => setData('title', e.target.value)}
              placeholder="Ej. Política de reembolsos"
              maxLength={200}
              className={cn('h-[42px] rounded-[10px]', errors.title && 'border-bad')}
              required
            />
            <FieldError messages={errors.title} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content" className="text-[13px] font-semibold">
              Contenido *
            </Label>
            <Textarea
              id="content"
              name="content"
              value={data.content}
              onChange={(e) => setData('content', e.target.value)}
              placeholder={
                'Escribe en párrafos cortos y separados por una línea en blanco.\n\n' +
                'Cada párrafo se indexa por separado, así que una idea por párrafo se recupera mejor.'
              }
              rows={18}
              maxLength={50_000}
              className={cn('rounded-[10px] font-mono text-[13px]', errors.content && 'border-bad')}
              required
            />
            <p className="text-muted-foreground text-[13px]">
              {data.content.length.toLocaleString('es')} / 50.000 caracteres. Al guardar, el documento vuelve a la cola
              de indexado.
            </p>
            <FieldError messages={errors.content} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="outline" className="h-[42px] rounded-[10px]" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="h-[42px] rounded-[10px]">
          <Check className="size-4" />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear documento' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
