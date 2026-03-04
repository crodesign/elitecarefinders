const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fs = require('fs');

async function main() {
    const sql = fs.readFileSync('backfill-wp-dates.sql', 'utf8');

    // Extract slugs from the SQL
    const homeSlugMatches = [...sql.matchAll(/UPDATE homes SET.*?WHERE slug = '([^']+)'/g)];
    const facilitySlugMatches = [...sql.matchAll(/UPDATE facilities SET.*?WHERE slug = '([^']+)'/g)];
    const backfilledHomeSlugs = new Set(homeSlugMatches.map(m => m[1]));
    const backfilledFacilitySlugs = new Set(facilitySlugMatches.map(m => m[1]));

    console.log(`SQL covers: ${backfilledHomeSlugs.size} homes, ${backfilledFacilitySlugs.size} facilities`);

    // Fetch all homes from DB
    const { data: homes } = await s.from('homes').select('slug, title, created_at, updated_at').order('created_at');
    const { data: facilities } = await s.from('facilities').select('slug, title, created_at, updated_at').order('created_at');

    console.log(`DB has: ${(homes || []).length} homes, ${(facilities || []).length} facilities`);

    // Find homes NOT in the SQL
    const missingHomes = (homes || []).filter(h => !backfilledHomeSlugs.has(h.slug));
    const missingFacilities = (facilities || []).filter(f => !backfilledFacilitySlugs.has(f.slug));

    if (missingHomes.length > 0) {
        console.log(`\nHomes NOT in backfill SQL (${missingHomes.length}):`);
        missingHomes.forEach(h => console.log(`  ${h.slug} | created: ${h.created_at?.substring(0, 10)} | ${h.title}`));
    } else {
        console.log('\nAll homes are covered in the SQL.');
    }

    if (missingFacilities.length > 0) {
        console.log(`\nFacilities NOT in backfill SQL (${missingFacilities.length}):`);
        missingFacilities.forEach(f => console.log(`  ${f.slug} | created: ${f.created_at?.substring(0, 10)} | ${f.title}`));
    } else {
        console.log('\nAll facilities are covered in the SQL.');
    }

    // Also check if any slugs in the SQL don't match DB
    const dbHomeSlugs = new Set((homes || []).map(h => h.slug));
    const dbFacilitySlugs = new Set((facilities || []).map(f => f.slug));

    const orphanedHomeSlugs = [...backfilledHomeSlugs].filter(s => !dbHomeSlugs.has(s));
    const orphanedFacilitySlugs = [...backfilledFacilitySlugs].filter(s => !dbFacilitySlugs.has(s));

    if (orphanedHomeSlugs.length > 0) {
        console.log(`\nSlugs in SQL but NOT in DB - homes (${orphanedHomeSlugs.length}):`);
        orphanedHomeSlugs.forEach(s => console.log(`  ${s}`));
    }
    if (orphanedFacilitySlugs.length > 0) {
        console.log(`\nSlugs in SQL but NOT in DB - facilities (${orphanedFacilitySlugs.length}):`);
        orphanedFacilitySlugs.forEach(s => console.log(`  ${s}`));
    }
}
main().catch(console.error);
