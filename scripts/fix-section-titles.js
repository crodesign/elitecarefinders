const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'src', 'components', 'admin', 'forms');

const files = [
  path.join(BASE, 'home', 'HomeInformationTab.tsx'),
  path.join(BASE, 'home', 'HomeRoomsTab.tsx'),
  path.join(BASE, 'home', 'HomeFieldCategory.tsx'),
  path.join(BASE, 'facility', 'FacilityInformationTab.tsx'),
  path.join(BASE, 'facility', 'FacilityRoomsTab.tsx'),
  path.join(BASE, 'facility', 'FacilityFieldCategory.tsx'),
  path.join(BASE, 'facility', 'FacilityLocationTab.tsx'),
];

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  const next = src.replace(/pt-\[5px\] pl-\[5px\]/g, 'pt-[5px] pl-[5px] pb-[5px]');
  if (next !== src) {
    fs.writeFileSync(f, next, 'utf8');
    console.log(`Updated: ${path.basename(f)}`);
  }
}
console.log('Done.');
