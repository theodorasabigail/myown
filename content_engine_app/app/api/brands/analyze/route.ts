import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    // Use the first image for analysis (LLaVA takes one image at a time)
    const firstUrl = (fileUrls as string[])[0];
    const imgRes = await fetch(firstUrl);
    const buffer = await imgRes.arrayBuffer();
    const imageBytes = Array.from(new Uint8Array(buffer));

    const prompt = `Analyze this brand material image and extract structured brand guidelines.
Return ONLY valid JSON (no markdown):
{
  "typography": "Font families, heading/body sizes, line-height style",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "spacing": "Grid system, section padding, margin patterns",
  "tone": "Voice and tone in 1-2 sentences",
  "visualStyle": "Visual aesthetic in 1-2 sentences"
}`;

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBytes, prompt }),
      }
    );

    if (!res.ok) throw new Error(`CF AI error: ${res.status}`);
    const data = await res.json();
    const guidelines = JSON.parse(stripMarkdown(data.result.description));

    await supabase.from('brands').update({ guidelines }).eq('id', brandId);

    return NextResponse.json({ guidelines });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
