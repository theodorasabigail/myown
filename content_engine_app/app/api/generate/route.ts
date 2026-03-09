import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

async function cfAI(model: string, body: object): Promise<any> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`CF AI error: ${res.status} ${await res.text()}`);
  return res.json();
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

    const isCarousel = (outputFormats as string[]).includes('carousel');

    const prompt = `You are an expert UI/UX designer and front-end developer creating stunning marketing visuals.

BRAND: ${brand.name}
Primary color: ${brand.primary_color ?? '#1A2B3C'}
Voice: ${brand.tone_of_voice ?? 'Professional'}
Narrative: ${narrative || 'Not provided'}

CONTENT:
${copy}

FORMAT: ${(outputFormats as string[]).join(', ')} — Specs: ${formatSpecs}
${customHints ? `HINTS: ${customHints}` : ''}

VISUAL DESIGN RULES (follow strictly):
1. Use the brand primary color for hero backgrounds, headings, and accent elements
2. Create a rich visual hierarchy: large bold headline (48-72px), clear subheading (20-24px), readable body (16px)
3. Add depth with box-shadow: 0 4px 24px rgba(0,0,0,0.12) on cards
4. Use generous padding (40-60px sections), never cramped
5. Hero section: full-width background in brand color, white text, centered, minimum 200px tall
6. Use CSS gradients for backgrounds where appropriate: linear-gradient(135deg, primaryColor, darkerShade)
7. Cards/sections: white background, border-radius: 12px, subtle border: 1px solid #eee
8. Typography: font-family: 'Segoe UI', system-ui, sans-serif throughout
9. Accent bars, dividers, or highlights using brand color
10. Image placeholders: <div data-placement="hero" style="width:100%;height:280px;background:linear-gradient(135deg,#ddd,#eee);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px">Image</div>

${isCarousel ? `CAROUSEL RULES (critical):
- Create 4-6 slides, each a full-screen div (width:100%, min-height:500px)
- All slides hidden by default (display:none) except slide 1 (display:flex)
- Navigation: use <button onclick="..."> with inline JavaScript to show/hide slides — NEVER use <a href> for navigation
- Include prev/next buttons and dot indicators
- Each slide should have a distinct visual: alternating brand color background and white background
- JavaScript navigation example: onclick="document.querySelectorAll('.slide').forEach(s=>s.style.display='none'); document.getElementById('s2').style.display='flex'"
` : ''}

OUTPUT: Respond ONLY with this exact JSON structure, no markdown, no explanation:
{"htmlLayout":"<html>...</html>","imagePrompts":[{"description":"...","placement":"hero"}]}`;

    const data = await cfAI('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });
    const raw = stripMarkdown(data.result.response);
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
