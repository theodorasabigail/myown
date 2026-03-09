# Verification & Testing Reference

Step-by-step procedures to confirm every part of the engine is working correctly.

---

## Prerequisites

```bash
# Install deps
npm install

# Set env vars (.env.local)
ANTHROPIC_API_KEY=sk-ant-...
CF_ACCOUNT_ID=...
CF_API_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Run dev server
npm run dev
```

---

## 1. Supabase Schema

Verify tables exist and RLS is configured:

```sql
-- Run in Supabase SQL editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: brands, brand_guidelines, brand_narratives, projects, templates, project_exports
```

---

## 2. Brand Management CRUD

**Create a brand:**
```bash
curl -X POST http://localhost:3000/api/brands \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Brand",
    "description": "Verification brand",
    "primary_color": "#1A2B3C",
    "secondary_colors": ["#FF5733"],
    "tone_of_voice": "Direct, professional"
  }'
# Expected: 201 with { id, name, ... }
```

Save the returned `id` as `BRAND_ID` for subsequent tests.

**Read brands:**
```bash
curl http://localhost:3000/api/brands
# Expected: 200 with array including Test Brand
```

---

## 3. Brand Analysis Endpoint

Upload a sample brand file (a PDF or PNG) to Supabase storage first, then:

```bash
curl -X POST http://localhost:3000/api/brands/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "<BRAND_ID>",
    "fileUrls": ["<SUPABASE_STORAGE_PUBLIC_URL>"]
  }'
```

**Expected response:**
```json
{
  "guidelines": {
    "typography": "...",
    "colorPalette": ["#hex1", "#hex2"],
    "spacing": "...",
    "tone": "...",
    "visualStyle": "..."
  }
}
```

**Verify saved to DB:**
```sql
SELECT guidelines FROM brands WHERE id = '<BRAND_ID>';
-- Expected: non-null JSONB with all 5 fields
```

---

## 4. Content Generation — Base Case

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "<BRAND_ID>",
    "copy": "Introducing our new product. It solves the core problem in a simple, elegant way. Built for teams that move fast.",
    "outputFormats": ["pdf"]
  }'
```

**Expected response:**
```json
{
  "projectId": "uuid",
  "htmlLayout": "<!DOCTYPE html>...",
  "images": [{ "placement": "hero", "url": "data:image/png;base64,...", "prompt": "..." }]
}
```

**Checks:**
- `htmlLayout` is valid HTML with inline CSS
- `images` array has at least one entry with a base64 data URL
- `projectId` exists in the `projects` table with `status: 'draft'`
- HTML contains brand colors from the brand profile

---

## 5. Multi-Format Generation

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "<BRAND_ID>",
    "copy": "Short punchy headline. Supporting sentence that reinforces the value prop.",
    "outputFormats": ["pdf", "png", "linkedin", "twitter"]
  }'
```

**Checks:**
- Response includes a single `htmlLayout` valid for all selected formats
- `output_formats` column in `projects` table stores the array

---

## 6. PDF Export

In the browser UI after generating:
1. Click "Export PDF"
2. File downloads as `BrandName_timestamp.pdf`

**Checks:**
- PDF opens correctly
- Typography matches brand guidelines
- Images are embedded (not broken)
- Layout fits A4 page without overflow

Alternatively, test `html2pdf` directly in browser console:
```javascript
import html2pdf from 'html2pdf.js';
html2pdf().from(document.querySelector('.preview-container')).save();
```

---

## 7. PNG Export

1. Click "Export PNG"
2. File downloads as `.png`

**Checks:**
- Dimensions match selected format (e.g. 1080×1350 for Instagram)
- Scale is @2x (crisp on retina)
- No white flash or clipping artifacts

---

## 8. Carousel Export

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "<BRAND_ID>",
    "copy": "Slide 1 headline.\n\nSlide 2 body content with more detail.\n\nSlide 3 CTA: Get started today.",
    "outputFormats": ["carousel"]
  }'
```

After generating, click "Export Carousel":
- Downloads a ZIP file
- ZIP contains `slide_1.png`, `slide_2.png`, etc. at 1080×1350px each
- `carousel_manifest.json` present with copy per slide

---

## 9. Visual Reference

Prepare a reference image (any marketing ad or layout you want to style-match), encode to base64:

```bash
BASE64=$(base64 -i reference.png)

curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"brandId\": \"<BRAND_ID>\",
    \"copy\": \"Test copy for visual reference check.\",
    \"outputFormats\": [\"png\"],
    \"visualReference\": {
      \"mediaType\": \"image/png\",
      \"data\": \"$BASE64\"
    }
  }"
```

**Checks:**
- `htmlLayout` reflects the layout structure of the reference (column count, hero placement, spacing style)
- Brand colors still applied (not copied from reference)
- No text or logos copied from reference image

---

## 10. Product Image / Mockup Mode

```bash
PRODUCT_BASE64=$(base64 -i ebook-cover.png)

curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"brandId\": \"<BRAND_ID>\",
    \"copy\": \"Our definitive guide to growing your audience.\",
    \"outputFormats\": [\"png\"],
    \"productImage\": {
      \"mediaType\": \"image/png\",
      \"data\": \"$PRODUCT_BASE64\"
    }
  }"
```

**Checks:**
- Response includes `productPlacement: { deviceFrame: "laptop"|"phone"|"tablet"|"none", productType: "digital"|"physical" }`
- `htmlLayout` contains the product image embedded as base64 (not a Cloudflare-generated image)
- For digital products: HTML includes a CSS device frame wrapping the product image
- AI-generated images (Cloudflare) are background/scene only — none replace the product
- `has_product_image: true` in the saved project row

---

## 11. Batch Export (Multiple Formats)

In the browser, select all format checkboxes, then click Generate + Export All:
- Should receive simultaneous download prompts for each format
- Each file named correctly with format suffix

Programmatic check:
```typescript
await batchExport(htmlLayout, ['pdf', 'png', 'carousel'], 'TestBrand');
// Should trigger 3 downloads in parallel without errors
```

---

## 12. Project History

```bash
curl http://localhost:3000/api/projects
# Expected: array of saved projects with brandId, status, createdAt, outputFormats
```

Verify the latest project has:
- `status: 'draft'`
- `layout_html`: non-null
- `output_formats`: array matching what was requested
- `has_visual_reference` / `has_product_image`: boolean matching the test

---

## 13. Templates

After generating a piece you like, in the UI:
1. Click "Save as Template" → enter name "Verification Template"
2. On a new content piece, select "Verification Template" from dropdown
3. Custom hints should pre-populate

```bash
curl http://localhost:3000/api/templates
# Expected: includes "Verification Template" with layout_html and output_formats
```

---

## End-to-End Smoke Test (Full Flow)

Run this sequence once per deploy to confirm everything works together:

1. Create brand → upload guidelines PDF → run analyze → confirm `guidelines` JSON saved
2. Create content → paste 3 paragraphs of copy → select PDF + PNG → click Generate
3. Confirm preview renders → export both formats → open both files
4. Repeat with a visual reference image → confirm layout style-matches reference
5. Repeat with a product image (ebook cover) → confirm device frame + hero placement
6. Save as template → create new piece → load template → generate with new copy
7. Check `projects` table — 3 rows with correct metadata

**All 6 success criteria from SKILL.md should be testable via this sequence.**

---

## Common Failure Points

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `htmlLayout` is generic, ignores brand | `guidelines` not extracted or not passed to prompt | Run `/api/brands/analyze` first; check `extractedGuidelines` in buildPrompt |
| Images not embedded in HTML | Cloudflare API returning error | Check `CF_ACCOUNT_ID` and `CF_API_TOKEN`; inspect `generateImage()` response |
| PDF export is blank | html2pdf can't render the HTML | Ensure no external font/image URLs; use inline CSS + base64 images only |
| Visual reference not affecting layout | Image not being passed to Claude | Check `visualReference` block in `userContent` array before Claude call |
| Product image replaced by AI image | `data-placement="product"` not in Claude's HTML | Verify `buildProductModePrefix()` instructions are in the message; check Claude response for `data-placement="product"` |
| Brand analysis returns empty JSON | Claude couldn't read the file format | Convert PDF to PNG first (`pdfjs-dist`); ensure file is readable as image |
