import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, primary_color, tone_of_voice, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { brand_narratives, ...brandData } = await req.json();

  const { data: brand, error } = await supabase
    .from('brands')
    .insert(brandData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (brand_narratives?.[0]?.content) {
    await supabase.from('brand_narratives').insert({
      brand_id: brand.id,
      content: brand_narratives[0].content,
    });
  }

  return NextResponse.json(brand, { status: 201 });
}
