'use strict';
// Quick test of buildRoomDetails against AINA-1001-02 meta
const meta = {
    care_provider_name: 'Lan Chen',
    care_provider_phone_number: '808-358-3354',
    care_provider_title: 'Certified Nurse Aide (CNA)',
    care_provider_hours: 'Full Time',
    care_provider_gender: 'Female Caregiver',
    about_care_provider: 'Care home operator is a CNA and has over 12 years of experience',
    television: '<span class="item yes">Television</span>',
    air_conditioning: '<span class="item no">Air Conditioning</span>',
    wifi_included: '<span class="item yes">WiFi Included</span>',
    nightstand_with_lamp: '<span class="item no">Nightstand with Lamp</span>',
    night_stand_with_lamp: '<span class="item yes">Night Stand with Lamp</span>',
    sitting_area: '<span class="item yes">Sitting Area</span>',
    hospital_bed: '<span class="item yes">Hospital Bed</span>',
    full_kitchen: '<span class="item yes">Full Kitchen</span>',
    private_lanai_patio_or_balcony: '<span class="item yes">Private Lanai, Patio, or Balcony</span>',
    desk: '<span class="item no">Desk</span>',
    bedroom_type: 'Semi-private Bedroom (female)',
    bathroom_type: 'Full shared',
    shower_type: '(wheel-in shower)',
    bedroom_type_1: 'Private Bedroom',
    bathroom_type_1: 'Private half bath',
    shower_type_1: '(step-in shower)',
};

function isYes(val) {
    if (!val) return false;
    const v = val.trim();
    return /class="[^"]*\byes\b/.test(v) || v === 'yes' || v === '1';
}
function normalizeGender(val) {
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v.includes('female')) return 'Female';
    if (v.includes('male')) return 'Male';
    return 'Unknown';
}
function firstNonEmpty(meta, ...keys) {
    for (const k of keys) { const v = (meta[k] || '').trim(); if (v) return v; }
    return '';
}

const boolMap = [
    ['TV',          'television'],
    ['AC',          'air_conditioning'],
    ['NIGHTSTAND',  'nightstand_with_lamp', 'night_stand_with_lamp'],
    ['WIFI',        'wifi_included'],
    ['KITCHEN',     'full_kitchen'],
    ['HOSPITAL_BED','hospital_bed'],
    ['SITTING',     'sitting_area'],
    ['DESK',        'desk'],
    ['LANAI',       'private_lanai_patio_or_balcony', 'private_patio_deck_or_balcony'],
];

const cf = {};
for (const [id, ...keys] of boolMap) {
    const hasValue = keys.some(k => meta[k] !== undefined && meta[k] !== '');
    if (hasValue) cf[id] = keys.some(k => isYes(meta[k]));
}
cf['PROVIDER_NAME'] = meta.care_provider_name || undefined;
cf['PROVIDER_TITLE'] = meta.care_provider_title || undefined;
cf['PROVIDER_PHONE'] = meta.care_provider_phone_number || undefined;
cf['PROVIDER_GENDER'] = normalizeGender(meta.care_provider_gender);
cf['ABOUT_PROVIDER'] = meta.about_care_provider || undefined;
cf['PROVIDER_HOURS'] = meta.care_provider_hours || undefined;

console.log('customFields:');
for (const [k, v] of Object.entries(cf)) console.log(' ', k, '=', v);
console.log('\nbedroomType:', firstNonEmpty(meta, 'bedroom_type', 'bedroom_type_1'));
console.log('bathroomType:', firstNonEmpty(meta, 'bathroom_type', 'bathroom_type_1'));
console.log('showerType:', firstNonEmpty(meta, 'shower_type', 'shower_type_1'));
