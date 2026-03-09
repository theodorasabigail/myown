import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FORMAT_SPECS: Record<string, string> = {
  pdf:       'A4 (794×1123px), 40px margins, single-column, print-ready',
  png:       '1080×1350px, bold visuals, minimal text',
  carousel:  '1080×1350px per slide, auto-paginate at section breaks, 5-10 slides',
  linkedin:  '1200×627px, professional tone, text-forward',
  twitter:   '1024×512px, high contrast, single key message',
  tiktok:    '1080×1920px vertical, bold typography, mobile-first',
};

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, copy, outputFormats, customHints } = await req.json();

    // Load brand + latest narrative
    const { data: brand, error } = await supabase
      .from('brands')
      .select('*, brand_narratives(content)')
      .eq('id', brandId)
      .single();

    if (error || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const narrative = brand.brand_narratives?.[0]?.content ?? '';
    const formatSpecs = (outputFormats as string[])
      .map(f => `${f.toUpperCase()}: ${FORMAT_SPECS[f] ?? f}`)
      .join(' | ');

    const prompt = `You are a professional layout designer for the brand "${brand.name}".
Design a polished, brand-consistent HTML layout for the following marketing content.

Brand:
- Primary color: ${brand.primary_color ?? '#1A2B3C'}
- Voice: ${brand.tone_of_voice ?? 'Professional'}
- Narrative: ${narrative || 'Not provided'}

Content to lay out:
${copy}

Output format(s): ${(outputFormats as string[]).join(', ')}
Specifications: ${formatSpecs}
${customHints ? `Layout hints: ${customHints}` : ''}

Requirements:
- Use inline CSS only (no external stylesheets or scripts)
- Use the brand's primary color for headings, accents, and highlights
- For each image, add a placeholder: <img data-placement="hero" style="width:100%;height:300px;object-fit:cover;background:#eee">
- The layout must be self-contained and render correctly in an iframe
- Make it visually polished — generous whitespace, clear hierarchy, professional typography

Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "htmlLayout": "<complete self-contained HTML with all inline CSS>",
  "imagePrompts": [
    { "description": "Detailed image generation prompt, max 100 words", "placement": "hero" }
  ]
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const raw = stripMarkdown(result.response.text());
    const { htmlLayout, imagePrompts } = JSON.parse(raw);

    // Generate images via Cloudflare Workers AI (optional — skip gracefully if not configured)
    let finalHtml = htmlLayout;
    if (
      Array.isArray(imagePrompts) &&
      imagePrompts.length > 0 &&
      process.env.CF_ACCOUNT_ID &&
      process.env.CF_API_TOKEN
    ) {
      const images = await Promise.all(
        imagePrompts.map(async (p: { description: string; placement: string }) => ({
          placement: p.placement,
          url: await generateImage(p.description),
        }))
      );
      for (const img of images) {
        if (img.url) {
          finalHtml = finalHtml.replace(
            `data-placement="${img.placement}"`,
            `src="${img.url}" data-placement="${img.placement}"`
          );
        }
      }
    }

    // Auto-save project
    await supabase.from('projects').insert({
      brand_id: brandId,
      copy,
      layout_html: finalHtml,
      output_formats: outputFormats,
      status: 'draft',
    });

    return NextResponse.json({ htmlLayout: finalHtml });
  } catch (e: any) {
    console.error('Generate error:', e);
    return NextResponse.json({ error: e.message ?? 'Unexpected error' }, { status: 500 });
  }
}

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-v1-5-inpainting`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'text, watermark, logo, signature, blurry, low quality, distorted',
        }),
      }
    );
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}
