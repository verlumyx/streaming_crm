import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { SignOutButton } from './SignOutButton';

export const metadata = { title: 'Sin acceso' };

export default async function NoAccessPage() {
  const user = await requireSessionUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <ShieldAlert className="size-12 text-destructive" />
          <h1 className="text-2xl font-bold">No tienes empresas activas disponibles.</h1>
          <p className="text-sm text-muted-foreground">
            Tu usuario <span className="font-medium">{user.email}</span> no tiene acceso activo a ninguna empresa.
            Contacta al administrador para que te asigne una.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
