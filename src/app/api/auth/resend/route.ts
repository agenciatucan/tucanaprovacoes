import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/actions/auth';

// Rota pública (usada em /definir-senha): delega para requestPasswordReset, que aplica
// rate limit por e-mail e não revela se a conta existe.
export async function POST(request: Request) {
  let email = '';
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    // corpo inválido → tratado como e-mail ausente
  }

  if (!email) {
    return NextResponse.json({ success: false, error: 'E-mail obrigatório' }, { status: 400 });
  }

  const result = await requestPasswordReset(email);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 429 });
  }

  return NextResponse.json({ success: true });
}
