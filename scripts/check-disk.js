const fs = require("fs");
const path = require("path");

const mediaDir = path.join(__dirname, "..", "public", "images", "media");

const files = fs.readdirSync(mediaDir);
const fresFiles = files.filter(f => f.toLowerCase().startsWith('fres'));
const chanFiles = files.filter(f => f.toLowerCase().startsWith('chan'));

console.log(`Found ${fresFiles.length} fres files:`, fresFiles);
console.log(`Found ${chanFiles.length} chan files:`, chanFiles);
