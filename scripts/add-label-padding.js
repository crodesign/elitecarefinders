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
  // Add pl-[5px] to any label className that doesn't already have it
  const next = src.replace(/<label className="([^"]+)"/g, (match, cls) => {
    if (cls.includes('pl-[5px]')) return match;
    return `<label className="${cls} pl-[5px]"`;
  });
  if (next !== src) {
    const count = (next.match(/<label className="[^"]*pl-\[5px\][^"]*"/g) || []).length;
    console.log(`Updated: ${path.basename(f)} (${count} labels)`);
    fs.writeFileSync(f, next, 'utf8');
  } else {
    console.log(`No changes: ${path.basename(f)}`);
  }
}
console.log('Done.');
