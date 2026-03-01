const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Count homes with featured_label set but is_featured false
  const { data: all, error } = await supabase
    .from('homes')
    .select('slug, is_featured, featured_label, description')
    .not('featured_label', 'is', null);

  if (error) { console.error(error); return; }

  console.log('Homes with featured_label set:', all.length);
  console.log('\nBreakdown:');
  let withHTML = 0, shouldBeTrue = 0;
  for (const h of all) {
    const hasHTML = h.featured_label && h.featured_label.includes('<');
    if (hasHTML) withHTML++;
    const isFeaturedByLabel = h.featured_label && h.featured_label.toLowerCase().includes('featured');
    if (isFeaturedByLabel && !h.is_featured) {
      shouldBeTrue++;
      console.log('  MISMATCH:', h.slug, '| is_featured:', h.is_featured, '| label:', h.featured_label);
    }
  }
  console.log('\nWith HTML in label:', withHTML);
  console.log('Should have is_featured=true but dont:', shouldBeTrue);

  // Also check description HTML
  const { data: descHTML } = await supabase
    .from('homes')
    .select('slug, description')
    .like('description', '%<%');
  console.log('\nHomes with HTML in description:', descHTML ? descHTML.length : 0);
}
main();
