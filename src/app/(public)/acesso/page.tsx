import { Metadata } from 'next';
import TokenAccessForm from '@/components/auth/TokenAccessForm';

export const metadata: Metadata = {
  title: 'Acesso ao cronograma',
};

export default function AcessoPage() {
  return <TokenAccessForm mode="full" />;
}