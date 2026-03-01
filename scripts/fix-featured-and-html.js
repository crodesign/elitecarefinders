/**
 * Fixes two data issues:
 * 1. Sets is_featured=true for homes where featured_label has <div class="feature-label">FEATURED HOME</div>
 *    and clears the HTML, replacing with plain "Featured"
 * 2. Strips HTML tags from the description field
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

function stripHtml(str) {
  if (!str) return str;
  return str
    .replace(/<[^>]+>/g, '') // remove tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN]' : '[LIVE]', 'Starting fix...\n');

  // --- Fix 1: featured_label HTML + is_featured ---
  const { data: featuredHomes, error: e1 } = await supabase
    .from('homes')
    .select('id, slug, is_featured, featured_label')
    .not('featured_label', 'is', null);

  if (e1) { console.error('Error fetching homes:', e1); return; }

  let featuredFixed = 0;
  for (const h of featuredHomes) {
    if (!h.featured_label || !h.featured_label.includes('<')) continue;

    // Extract text from HTML div and map to valid label
    const labelText = stripHtml(h.featured_label).trim().toUpperCase();
    const LABEL_MAP = {
      'FEATURED HOME': 'Featured',
      'COMING SOON': 'Coming Soon',
      'NEW LISTING': 'New Listing',
      'GREAT VALUE': 'Great Value',
      'DESIRABLE LOCATION': 'Desirable Location',
    };
    const mappedLabel = LABEL_MAP[labelText] || 'Featured';
    const updates = { featured_label: mappedLabel };
    if (!h.is_featured) updates.is_featured = true;

    console.log(`FEATURED FIX: ${h.slug} | is_featured: ${h.is_featured} -> true | label -> "${mappedLabel}"`);

    if (!DRY_RUN) {
      const { error } = await supabase.from('homes').update(updates).eq('id', h.id);
      if (error) console.error('  Error updating', h.slug, error.message);
    }
    featuredFixed++;
  }
  console.log(`\nFeatured label fixes: ${featuredFixed} homes\n`);

  // --- Fix 2: Strip HTML from description ---
  // Fetch all homes - paginate to avoid limits
  let page = 0;
  const PAGE_SIZE = 200;
  let descFixed = 0;
  let descSkipped = 0;

  while (true) {
    const { data: homes, error: e2 } = await supabase
      .from('homes')
      .select('id, slug, description')
      .not('description', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (e2) { console.error('Error fetching homes for desc:', e2); break; }
    if (!homes || homes.length === 0) break;

    for (const h of homes) {
      if (!h.description || !h.description.includes('<')) {
        descSkipped++;
        continue;
      }

      const cleaned = stripHtml(h.description);
      if (cleaned === h.description) { descSkipped++; continue; }

      console.log(`DESC FIX: ${h.slug} | before: "${h.description.substring(0, 80).replace(/\n/g, ' ')}" -> after: "${cleaned.substring(0, 80).replace(/\n/g, ' ')}"`);

      if (!DRY_RUN) {
        const { error } = await supabase.from('homes').update({ description: cleaned }).eq('id', h.id);
        if (error) console.error('  Error updating desc for', h.slug, error.message);
      }
      descFixed++;
    }

    if (homes.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nDescription HTML fixes: ${descFixed} homes (${descSkipped} skipped - no HTML)`);
  console.log('\nDone.');
}

main().catch(console.error);
