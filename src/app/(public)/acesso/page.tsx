import { Metadata } from 'next';
import Link from 'next/link';
import TokenPasteForm from '@/components/auth/TokenPasteForm';

export const metadata: Metadata = {
  title: 'Acesso ao cronograma',
};

export default function AcessoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f6] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-[#eb6013]">
          Aprovação pública
        </p>

        <h1 className="text-2xl font-bold text-zinc-900">
          Acesso ao cronograma
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Cole abaixo o link ou código de acesso enviado pela equipe Tucan.
        </p>

        <div className="mt-6">
          <TokenPasteForm />
        </div>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-sm font-medium text-[#25411e] hover:underline">
            Entrar com login e senha
          </Link>
        </div>
      </div>
    </main>
  );
}
