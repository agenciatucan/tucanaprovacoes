import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return NextResponse.json({ hasSession: !!session });
  } catch (error: any) {
    return NextResponse.json({ hasSession: false, error: String(error) }, { status: 500 });
  }
}
