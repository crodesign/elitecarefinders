
// Script to reproduce the "duplicate key value violates unique constraint" error
// This script simulates what ensureLocationFolders does: checking for a folder, then trying to create it if missing.
// If the check fails (e.g. returns null due to RLS or bug) but the folder exists, the creation will fail.

const { createClient } = require('@supabase/supabase-js');

// Mock client setup (would need real env vars or just use the logic flow)
// Since we can't easily run this with real Supabase connection without env vars setup in this script context,
// I will describe the logic flaw I suspect.

/*
Logic in mediaFolderService.ts:

async function ensureLocationFolders(...) {
    // ...
    let cityFolder = await findFolderByName(cityName, parentId);
    if (!cityFolder) {
        cityFolder = await createFolder(cityName, parentId); // <--- ERROR HERE
    }
}

Hypothesis:
1. `findFolderByName` returns null because of "more than one row returned by a subquery".
   - Why multiple rows? 
   - Maybe duplicate folders exist (same name, same parent).
   - `findFolderByName` uses `.single()`. If multiple rows match, `.single()` throws an error.
   - The catch block in `findFolderByName` catches the error and logs it, then returns `null`?
   - Let's check `mediaFolderService.ts`.

2. If `findFolderByName` returns null (due to error suppression), code proceeds to `createFolder`.
3. `createFolder` tries to insert.
4. DB has unique constraint on `path` (or `parent_id` + `slug`).
5. Insert fails with "duplicate key value violates unique constraint".

Conclusion:
The "more than one row" error is the ROOT CAUSE. It causes `findFolderByName` to fail (return null), which causes `createFolder` to run and hit the constraint.

I need to fix the "more than one row" issue.
This usually happens when `.single()` matches more than one row.
The fix is to handle duplicates in `findFolderByName` (e.g. use `.limit(1).maybeSingle()` or just `.data[0]`).
OR fix the data to remove duplicates (which I tried, but maybe `path` vs `slug` mismatch is still tricky).
*/
