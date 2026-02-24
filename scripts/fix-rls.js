// Fix RLS policies - run via service role key
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envFile = fs.readFileSync(path.join(__dirname, ".env.local"), "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Test 1: Can we insert a home with service role?
    console.log("Testing service-role INSERT on homes...");
    const { data: testHome, error: insertErr } = await sb
        .from("homes")
        .insert({ title: "RLS Test", slug: "rls-test", status: "draft" })
        .select("id")
        .single();

    if (insertErr) {
        console.log("Service role INSERT failed:", insertErr.message);
    } else {
        console.log("Service role INSERT OK, id:", testHome.id);
        // Clean up
        await sb.from("homes").delete().eq("id", testHome.id);
        console.log("Cleaned up test row");
    }

    // Test 2: Can we insert with anon-style client? (simulate what the browser does)
    console.log("\nTesting anon-key client with auth session...");
    const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Sign in with a test user to get a session
    const { data: session, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: "crodesign@gmail.com",
        password: "test", // This will likely fail but shows the pattern
    });

    if (signInErr) {
        console.log("Sign-in failed (expected):", signInErr.message);
        console.log("\nCannot test anon+auth INSERT without valid credentials.");
        console.log("The RLS issue needs to be fixed via Supabase Dashboard SQL Editor.");
        console.log("\nPlease run the following SQL in Supabase Dashboard > SQL Editor:");
        console.log("---");
        console.log(fs.readFileSync(path.join(__dirname, "migrations", "fix_rls_policies.sql"), "utf-8"));
    } else {
        console.log("Signed in as:", session.user?.email);
        const { error: anonInsertErr } = await anonClient
            .from("homes")
            .insert({ title: "Anon RLS Test", slug: "anon-rls-test", status: "draft" })
            .select("id")
            .single();

        if (anonInsertErr) {
            console.log("Anon+auth INSERT failed:", anonInsertErr.message);
        } else {
            console.log("Anon+auth INSERT succeeded!");
        }
    }
}

run().catch(console.error);
