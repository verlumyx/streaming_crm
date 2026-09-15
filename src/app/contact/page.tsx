import type { Metadata } from 'next';
import { LeadContact } from '@/modules/lead/ui/components/LeadContact';

export const metadata: Metadata = { title: { absolute: 'Contáctenos — StreamCRM' } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Public contact page (allowed by `src/proxy.ts`). `?sent=1` shows the thank-you state. */
export default async function ContactPage({ searchParams }: Props) {
  const { sent } = await searchParams;
  return <LeadContact sent={sent === '1'} />;
}
