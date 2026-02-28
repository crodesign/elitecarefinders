'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const { data: cats } = await supabase
        .from('room_field_categories')
        .select('id, name, section, column_number, display_order')
        .order('section').order('display_order');

    const { data: fields } = await supabase
        .from('room_field_definitions')
        .select('id, name, type, category_id, target_type, options, display_order, is_active')
        .order('display_order');

    const catMap = {};
    for (const c of cats) catMap[c.id] = c;

    console.log('\n=== Room Field Categories & Definitions ===\n');
    for (const c of cats) {
        const cFields = fields.filter(f => f.category_id === c.id && f.is_active);
        if (!cFields.length) continue;
        console.log(`[${c.section}] col=${c.column_number} "${c.name}" (cat_id=${c.id})`);
        for (const f of cFields) {
            const opts = f.options?.length ? ` opts=[${f.options.slice(0,3).join(', ')}${f.options.length>3?'...':''}]` : '';
            console.log(`  ${f.id}  type=${f.type.padEnd(10)} target=${f.target_type||'both'.padEnd(10)} "${f.name}"${opts}`);
        }
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });
