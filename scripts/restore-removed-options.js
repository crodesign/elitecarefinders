'use strict';
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: current } = await sb.from('room_fixed_field_options')
        .select('field_type, display_order')
        .in('field_type', ['levelOfCare', 'language'])
        .order('field_type').order('display_order', { ascending: false });

    const maxOrders = {};
    for (const row of (current || [])) {
        if (maxOrders[row.field_type] === undefined) maxOrders[row.field_type] = row.display_order;
    }

    const toInsert = [
        { field_type: 'levelOfCare', value: 'Ambulatory Care' },
        { field_type: 'levelOfCare', value: 'Hospice/Palliative Care' },
        { field_type: 'levelOfCare', value: 'Skilled Nursing' },
        { field_type: 'levelOfCare', value: 'Intermediate Care' },
        { field_type: 'language', value: 'German' },
        { field_type: 'language', value: 'Mandarin' },
        { field_type: 'language', value: 'Cantonese' },
        { field_type: 'language', value: 'Filipino/Tagalog' },
        { field_type: 'language', value: 'Portuguese' },
    ];

    const offsets = {};
    const rows = toInsert.map(item => {
        offsets[item.field_type] = (offsets[item.field_type] || 0) + 1;
        return {
            field_type: item.field_type,
            value: item.value,
            display_order: (maxOrders[item.field_type] || 0) + offsets[item.field_type],
            is_active: true,
        };
    });

    const { data, error } = await sb.from('room_fixed_field_options').insert(rows).select('field_type, value, display_order');
    if (error) { console.error('Error:', error.message); return; }
    for (const r of data) console.log('Inserted:', r.field_type, '|', r.value, '(order', r.display_order + ')');
}
run().catch(console.error);
