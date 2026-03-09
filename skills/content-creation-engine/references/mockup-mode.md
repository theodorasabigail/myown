# Mockup Mode Reference

CSS device frame templates and scene composition patterns for the product image feature.

---

## When Mockup Mode Activates

Whenever `productImage` is supplied in the generate request, Claude operates in mockup mode:
- The product image becomes the HTML hero (embedded directly, never AI-generated)
- AI-generated images (Cloudflare) fill only scene/background slots
- Claude detects product type and wraps digital products in a CSS device frame

---

## CSS Device Frames (Inline, No External Assets)

These are provided as implementation hints for Claude. Claude generates these inline in the HTML layout.

### Laptop Frame

For PDF covers, web app dashboards, SaaS screenshots:

```html
<div style="
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
">
  <!-- Laptop lid + screen -->
  <div style="
    background: #2a2a2a;
    border-radius: 12px 12px 0 0;
    padding: 16px 20px 10px;
    box-shadow: 0 -2px 20px rgba(0,0,0,0.3);
  ">
    <!-- Camera dot -->
    <div style="
      width: 6px; height: 6px;
      background: #555; border-radius: 50%;
      margin: 0 auto 8px;
    "></div>
    <!-- Screen area -->
    <div style="
      background: #000;
      border-radius: 4px;
      overflow: hidden;
      aspect-ratio: 16/10;
    ">
      <img data-placement="product" style="
        width: 100%; height: 100%; object-fit: cover; display: block;
      ">
    </div>
  </div>
  <!-- Laptop base -->
  <div style="
    background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
    height: 20px;
    border-radius: 0 0 4px 4px;
  "></div>
  <!-- Hinge bar -->
  <div style="
    background: #1a1a1a;
    height: 6px;
    border-radius: 0 0 8px 8px;
    width: 60%;
    margin: 0 auto;
  "></div>
</div>
```

### Phone Frame

For app screenshots, mobile-first content, vertical formats:

```html
<div style="
  position: relative;
  width: 240px;
  height: 500px;
  background: #1a1a1a;
  border-radius: 36px;
  padding: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 2px #333;
  margin: 0 auto;
">
  <!-- Dynamic Island -->
  <div style="
    width: 80px; height: 22px;
    background: #000;
    border-radius: 12px;
    margin: 0 auto 8px;
  "></div>
  <!-- Screen -->
  <div style="
    background: #000;
    border-radius: 24px;
    overflow: hidden;
    height: calc(100% - 30px);
  ">
    <img data-placement="product" style="
      width: 100%; height: 100%; object-fit: cover; display: block;
    ">
  </div>
</div>
```

### Tablet Frame

For ebook covers, landscape digital products, iPad-format content:

```html
<div style="
  position: relative;
  width: 480px;
  height: 340px;
  background: #2a2a2a;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.35), inset 0 0 0 2px #3a3a3a;
  margin: 0 auto;
">
  <!-- Camera -->
  <div style="
    position: absolute; top: 50%; left: 8px;
    transform: translateY(-50%);
    width: 5px; height: 5px;
    background: #444; border-radius: 50%;
  "></div>
  <!-- Screen -->
  <div style="
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    height: 100%;
  ">
    <img data-placement="product" style="
      width: 100%; height: 100%; object-fit: cover; display: block;
    ">
  </div>
</div>
```

---

## Scene/Background Prompts for Cloudflare

These go into `imagePrompts` when Claude generates mockup-mode layouts. The product image itself is never an image prompt — only the surrounding scene.

### Digital product on desk (laptop frame):
```
modern minimalist desk workspace, soft warm natural lighting from left,
shallow depth of field background, clean white or light wood desk surface,
no objects in foreground, professional photography, 3:2 ratio,
no text, no logos, no watermarks
```

### Phone in lifestyle context:
```
hand holding a modern smartphone, clean white studio background,
soft diffused lighting, product photography style, 2:3 ratio,
no text, no watermarks, no other screens visible
```

### PDF / ebook cover — flat lay:
```
flat lay product photography, clean white marble or light linen surface,
soft shadows, editorial lifestyle photography, overhead angle,
single product focus, no clutter, 4:5 ratio, no text, no logos
```

### Physical product hero:
```
studio product photography, clean gradient white-to-grey background,
soft box lighting, professional commercial photography, centered composition,
no text, no watermarks, 1:1 ratio
```

---

## Claude Prompt Reference (Full Text)

This is the text passed via `buildProductModePrefix()` in `references/api-setup.md`:

```
The image above is a product to be featured in marketing content.

Identify:
1. Product type: digital (ebook, PDF cover, app/SaaS screenshot) or physical
2. Best device frame if digital: laptop | phone | tablet | none
3. Key visual selling points visible in the image

Generate an HTML layout that:
- Places the product as the primary visual hero using: <img data-placement="product">
- If digital: wraps it in a CSS device frame (inline CSS only, no external assets)
- Wraps brand-consistent copy and typography around the product
- Uses imagePrompts ONLY for background/scene — NOT to replace the product

Return:
{
  "htmlLayout": "...",
  "imagePrompts": [{ "description": "scene background", "placement": "background" }],
  "productPlacement": { "deviceFrame": "laptop|phone|tablet|none", "productType": "digital|physical" }
}
```

---

## Layout Patterns

### Pattern A: Product left, copy right (landscape)
```
[Product mockup — 55%] | [Headline + subhead + CTA — 45%]
```
Best for: LinkedIn (1200×627), Twitter/X, PDF landscape

### Pattern B: Product centered, copy below (portrait)
```
          [Product mockup — 70% width, centered]
          [Headline]
          [Subhead / body copy]
          [CTA button]
```
Best for: Instagram (1080×1350), TikTok, phone format

### Pattern C: Full-bleed product, text overlay
```
[Product mockup fills frame]
[Headline overlaid at bottom — semi-transparent dark band]
```
Best for: PNG social posts, high-impact single-image ads
