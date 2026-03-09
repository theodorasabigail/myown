import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, fileUrls } = await req.json();

    const parts: any[] = [];
    for (const url of fileUrls as string[]) {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = res.headers.get('content-type') ?? 'image/png';
      parts.push({ inlineData: { data: base64, mimeType } });
    }

    parts.push({
      text: `Analyze these brand materials and extract structured brand guidelines.
Return ONLY valid JSON (no markdown):
{
  "typography": "Font families, heading/body sizes, line-height style",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "spacing": "Grid system, section padding, margin patterns",
  "tone": "Voice and tone in 1-2 sentences",
  "visualStyle": "Visual aesthetic in 1-2 sentences"
}`,
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(parts);
    const guidelines = JSON.parse(stripMarkdown(result.response.text()));

    await supabase.from('brands').update({ guidelines }).eq('id', brandId);

    return NextResponse.json({ guidelines });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
