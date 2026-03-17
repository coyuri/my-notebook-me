/**
 * GET /api/result/[id]
 * Returns the generation record from Supabase by ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'IDが指定されていません' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: '指定されたIDの生成結果が見つかりませんでした' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
