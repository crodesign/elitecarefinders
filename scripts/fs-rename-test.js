const fs = require("fs");
const { rename } = require("fs/promises");
const path = require("path");

async function testRename() {
    const root = path.join(__dirname, "..", "public", "images", "media");
    const oldFilename = "chan-000012240-4.jpg";
    const filePrefix = "chan-000012240";
    const newSlug = "fres-000012240";

    const escapedPrefix = filePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suffixMatch = oldFilename.match(new RegExp(`^${escapedPrefix}-(.+)$`));

    if (!suffixMatch) {
        console.log(`Match FAILED! Escaped prefix ^${escapedPrefix}-(.+)$ did not match ${oldFilename}`);
        return;
    }

    const suffix = suffixMatch[1]; // e.g., "4.jpg"
    const newFilename = `${newSlug}-${suffix}`;

    console.log(`Match SUCCESS! Suffix: ${suffix}. Target: ${newFilename}`);

    const oldFilePath = path.join(root, oldFilename);
    const newFilePath = path.join(root, newFilename);

    if (fs.existsSync(oldFilePath)) {
        try {
            await rename(oldFilePath, newFilePath);
            console.log(`File renamed successfully on disk!`);

            // Revert it immediately
            await rename(newFilePath, oldFilePath);
            console.log(`File reverted to old state successfully!`);
        } catch (err) {
            console.error(`Rename threw error:`, err);
        }
    } else {
        console.log(`File does not exist on disk: ${oldFilePath}`);
    }
}

testRename().catch(console.error);
