
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function testUpload() {
    console.log("Testing Site Image Upload (to root)...");

    // 1. Create a dummy image file
    const testImagePath = path.join(__dirname, 'test-site-image.jpg');
    fs.writeFileSync(testImagePath, 'Dummy image content');

    try {
        // 2. Upload to root (no folderId)
        const formData = new FormData();
        const blob = new Blob(['Dummy image content'], { type: 'image/jpeg' });
        formData.append('file', blob, 'test-site-image.jpg');

        const response = await fetch(`${BASE_URL}/api/media/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Upload failed: ${JSON.stringify(errData)}`);
        }

        const data = await response.json();
        const item = data.item;
        console.log("Upload response:", data);

        if (!item.url.startsWith('/images/') || item.url.startsWith('/images/media/')) {
            throw new Error(`Unexpected URL: ${item.url}. Should start with /images/ and NOT /images/media/`);
        }

        const physicalPath = path.join(process.cwd(), 'public', item.url);
        if (!fs.existsSync(physicalPath)) {
            throw new Error(`File does not exist on disk at: ${physicalPath}`);
        }
        console.log("Verified file exists at:", physicalPath);

        // 3. Test Deletion
        console.log("\nTesting Deletion of Site Image...");
        const deleteResponse = await fetch(`${BASE_URL}/api/media/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId: item.id })
        });

        if (!deleteResponse.ok) {
            const errData = await deleteResponse.json();
            throw new Error(`Delete failed: ${JSON.stringify(errData)}`);
        }

        const deleteData = await deleteResponse.json();
        console.log("Delete response:", deleteData);

        if (fs.existsSync(physicalPath)) {
            throw new Error(`File STILL exists on disk after deletion!`);
        }
        console.log("Verified file removed from disk.");

        console.log("\nSUCCESS: Site Image upload/delete flow verified.");

    } catch (error) {
        console.error("Test FAILED:", error.message);
    } finally {
        if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
    }
}

testUpload();
