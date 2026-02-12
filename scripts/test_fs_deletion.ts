
import { mkdir, rm, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

async function testDeletion() {
    const testDir = path.join(process.cwd(), "public", "images", "media", "test-deletion-folder");

    console.log("1. Creating test folder at:", testDir);
    try {
        await mkdir(testDir, { recursive: true });
        console.log("Folder created.");
    } catch (e) {
        console.error("Failed to create folder:", e);
        return;
    }

    console.log("2. Verifying folder exists...");
    if (existsSync(testDir)) {
        console.log("Folder exists on disk.");
    } else {
        console.error("Folder does NOT exist on disk!");
        return;
    }

    console.log("3. Deleting folder...");
    try {
        await rm(testDir, { recursive: true, force: true });
        console.log("Delete command executed.");
    } catch (e) {
        console.error("Delete command failed:", e);
    }

    console.log("4. Verifying folder is gone...");
    if (existsSync(testDir)) {
        console.error("FAILED: Folder still exists on disk!");
    } else {
        console.log("SUCCESS: Folder is gone.");
    }
}

testDeletion();
