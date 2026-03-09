import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const { data, error } = await supabase
    .from('brands')
    .select('*, brand_narratives(content, version)')
    .eq('id', params.brandId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const body = await req.json();
  const { data, error } = await supabase
    .from('brands')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.brandId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const { error } = await supabase.from('brands').delete().eq('id', params.brandId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
