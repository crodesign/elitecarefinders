# SEO Enhancement Plan — EliteCareFinders

**Created:** 2026-03-20
**Status:** Awaiting review before execution
**Scope:** Admin SEO tooling + public page structured data

---

## Context

The existing SEO system has solid infrastructure (meta tags, OG, JSON-LD for entities, Gemini AI generation) but the admin experience is bare — non-technical users have no feedback, no guidance, and no automation. These milestones improve the system from "fields to fill in" to "intelligent, mostly automatic SEO".

---

## Milestone 1 — Visible Feedback
*Pure UI. Zero backend changes. Makes SEO immediately understandable.*

### 1.1 — SERP Preview Component
**Files:** `src/components/admin/seo/SerpPreview.tsx` (new), `src/components/admin/forms/SeoTab.tsx` (update)

- New component renders a live Google-style snippet: blue title link, green URL breadcrumb, grey description text
- Updates in real time as Meta Title / Meta Description fields change
- Title truncates with ellipsis at 60 chars (with a visual indicator); description at 160
- Integrated below the title/description fields in `SeoTab`
- URL displayed uses `canonicalUrl` if set, otherwise a constructed default from `pathPrefix` + `slug`

### 1.2 — Social / OG Card Preview
**Files:** `src/components/admin/seo/OgCardPreview.tsx` (new), `src/components/admin/forms/SeoTab.tsx` (update)

- New component renders a Facebook/Twitter-style card mock: image thumbnail, domain label, title, description
- Falls back to meta title/description if OG fields are blank
- Falls back to first entity image if OG image URL is blank
- Integrated in the Social / Open Graph section of `SeoTab`

### 1.3 — Inline Field Guidance
**Files:** `src/components/admin/forms/SeoTab.tsx` (update)

- Visible help text (not tooltips) below each field — always shown, not on hover
- Copy per field:
  - **Meta Title:** "The blue headline shown in Google search results. Include your primary service and location. Aim for 50–60 characters."
  - **Meta Description:** "The grey summary text below the title in Google. Should explain what the page offers and why to click. Aim for 140–160 characters."
  - **Canonical URL:** "The definitive URL for this page. Leave blank unless this content exists at multiple URLs."
  - **OG Title:** "The title shown when this page is shared on Facebook or LinkedIn. Leave blank to use the Meta Title."
  - **OG Description:** "The description shown in social share previews. Leave blank to use the Meta Description."
  - **OG Image:** "The image shown in social share previews. Recommended size: 1200×630px."

---

## Milestone 2 — SEO Completeness Scoring
*Makes missing SEO visible without requiring the user to understand SEO.*

### 2.1 — Score Utility
**Files:** `src/lib/seoScore.ts` (new)

- Function `scoreSeo(seo: SeoFields): { score: number; total: number; missing: string[] }`
- Criteria (each worth 1 point):
  1. `metaTitle` filled
  2. `metaDescription` filled
  3. `ogTitle` or `metaTitle` set (OG title falls back — if meta title exists, OG is covered)
  4. `ogDescription` or `metaDescription` set
  5. `ogImageUrl` set
  6. `canonicalUrl` set
- Returns score (0–6), total (6), and array of human-readable missing items

### 2.2 — SeoTab Header Indicator
**Files:** `src/components/admin/forms/SeoTab.tsx` (update)

- Score badge in the SeoTab header row: "SEO Score: 4/6"
- Colour: red ≤2, amber 3–4, green 5–6
- Expands inline into a checklist of missing items (click to toggle)
- Recalculates live as fields are updated

---

## Milestone 3 — Smarter AI Generation
*Better, more targeted output from the existing Gemini integration.*

### 3.1 — Enhanced Gemini Prompts
**Files:** `src/lib/ai-seo.ts` (update), `src/app/api/generate-seo/route.ts` (update)

Prompt improvements:
- **Locality-aware:** Explicitly include island name (Oahu, Maui, Kauai, Big Island) and neighbourhood in generated copy — extracted from the entity's address
- **Intent-focused:** Titles and descriptions written for someone actively searching for care placement, not just describing the facility — include action-oriented language ("find", "trusted", "RN-guided")
- **Differentiated OG:** OG title/description must be meaningfully different from meta — meta targets Google crawlers, OG targets social sharers. The prompt enforces this distinction.
- **Primary keyword output:** AI returns a `primaryKeyword` field (e.g. "senior care homes Oahu") alongside the existing meta fields
- **Care-type aware:** Prompt includes the entity's care type(s) so generated copy uses appropriate terminology (care home vs. memory care vs. adult foster home)

API route update:
- Pass care types / taxonomy to the AI prompt for homes and facilities
- Return `primaryKeyword` in the API response JSON

### 3.2 — Primary Keyword Display in SeoTab
**Files:** `src/components/admin/forms/SeoTab.tsx` (update)

- After AI generation, display the suggested `primaryKeyword` as a badge next to the "Generate SEO" button
- Label: "Optimised for: senior care homes Oahu"
- Badge persists until next generation or manual field edit
- Stored only in component state — not saved to DB

---

## Milestone 4 — Auto-Generate on Save + Bulk Actions
*Removes SEO from the admin's to-do list entirely for new content.*

### 4.1 — Auto-Generate on Entity Create
**Files:** `src/app/admin/homes/page.tsx`, `src/app/admin/facilities/page.tsx`, `src/app/admin/posts/page.tsx` (updates), `src/app/api/generate-seo/route.ts` (minor update)

- When a home/facility/post is **created** (not updated), after the save completes:
  - Check if all SEO fields are empty
  - If yes, fire a non-blocking `fetch('/api/generate-seo', ...)` call in the background
  - On completion, patch the entity's SEO fields via the existing `updateHomeSeo` / `updateFacilitySeo` service functions
  - If the admin is still on the page, show a notification: "SEO auto-generated for [entity name]"
- No UX blocking — the save flow is unchanged; SEO generation happens after

### 4.2 — Bulk "Generate Missing SEO" Action
**Files:** `src/app/api/generate-seo/bulk/route.ts` (new), `src/app/admin/homes/page.tsx`, `src/app/admin/facilities/page.tsx`, `src/app/admin/posts/page.tsx` (updates)

- New API route: `POST /api/generate-seo/bulk` — accepts `{ contentType, ids[] }`, generates SEO sequentially for each, writes results to DB, returns progress
- Button in each admin list page header: "Generate SEO for [N] missing" (N = count of entities with empty SEO)
- Button triggers bulk route and shows progress: "Generated 3/12…"
- On completion: "Done — SEO generated for 12 listings"
- Rate-limited to avoid hammering Gemini API — 1 request per 500ms

---

## Milestone 5 — Homepage Structured Data (JSON-LD)
*Free structured data that improves Google's understanding of the business. Zero user input required.*

### 5.1 — Homepage JSON-LD Builder
**Files:** `src/lib/seo.ts` (update)

New function `buildHomepageJsonLd(input)` generates three nested schemas:

**`WebSite`** schema:
```json
{
  "@type": "WebSite",
  "name": "Elite CareFinders",
  "url": "https://elitecarefinders.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://elitecarefinders.com/homes?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

**`Organization`** schema:
- Name, URL, logo
- `sameAs` array populated from `social_accounts` site setting (Facebook, Instagram, etc.)

**`LocalBusiness`** schema:
- Business name, telephone, address (Hawaii)
- `priceRange`, `openingHours` — configurable via admin or hardcoded defaults

Input parameters pulled from:
- `social_accounts` site setting (already fetched on homepage)
- Homepage SEO admin `schemaJson` override field (if set, merged in)

### 5.2 — Inject into Homepage
**Files:** `src/app/(public)/page.tsx` (update)

- Fetch `social_accounts` alongside existing homepage data (already fetched — reuse)
- Call `buildHomepageJsonLd()` server-side
- Inject `<script type="application/ld+json">` tag into the page `<head>` via Next.js Script or inline script

### 5.3 — JSON-LD Preview in Homepage SEO Admin
**Files:** `src/app/admin/settings/seo-templates/page.tsx` (update)

- Add a read-only collapsible "Structured Data Preview" section to the Homepage card
- Shows the auto-generated JSON-LD prettified (same style as the entity SeoTab advanced section)
- Label: "Auto-generated from your site settings. Use the override field below to customise."
- Add a JSON override textarea (matches entity SeoTab pattern) saved as `schemaJson` on `homepage_seo`

---

## Execution Order

| Milestone | Dependencies | Risk |
|-----------|-------------|------|
| 1 — Visible Feedback | None | Low |
| 2 — Completeness Scoring | None | Low |
| 3 — Smarter AI | None | Low–Medium |
| 4 — Auto-Generate + Bulk | Milestone 3 (better prompts first) | Medium |
| 5 — Homepage JSON-LD | None | Low |

Milestones 1, 2, 3, and 5 are fully independent. Milestone 4 should follow Milestone 3 so bulk generation uses the improved prompts.

---

## Files Touched Summary

| File | Milestones |
|------|-----------|
| `src/components/admin/forms/SeoTab.tsx` | 1.1, 1.2, 1.3, 2.2, 3.2 |
| `src/components/admin/seo/SerpPreview.tsx` | 1.1 (new) |
| `src/components/admin/seo/OgCardPreview.tsx` | 1.2 (new) |
| `src/lib/seoScore.ts` | 2.1 (new) |
| `src/app/admin/homes/page.tsx` | 4.1, 4.2 |
| `src/app/admin/facilities/page.tsx` | 4.1, 4.2 |
| `src/app/admin/posts/page.tsx` | 4.1, 4.2 |
| `src/lib/ai-seo.ts` | 3.1 |
| `src/app/api/generate-seo/route.ts` | 3.1, 4.1 |
| `src/app/api/generate-seo/bulk/route.ts` | 4.2 (new) |
| `src/lib/seo.ts` | 5.1 |
| `src/app/(public)/page.tsx` | 5.2 |
| `src/app/admin/settings/seo-templates/page.tsx` | 5.3 |
