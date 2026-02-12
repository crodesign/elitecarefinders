
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/(^"|"$)/g, '');
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    console.log('Fetching a field definition...');
    const { data: fields, error: fetchError } = await supabase
        .from('room_field_definitions')
        .select('*')
        .limit(1);

    if (fetchError || !fields || fields.length === 0) {
        console.error('Failed to fetch fields', fetchError);
        return;
    }

    const field = fields[0];
    console.log('Original field:', field.name);
    console.log('Original target_type:', field.target_type);

    const newName = field.name + (field.name.endsWith('_U') ? '' : '_U');
    console.log('Attempting to update name to:', newName);

    // Test updating name AND target_type
    const { data: updated, error: updateError } = await supabase
        .from('room_field_definitions')
        .update({
            name: newName,
            target_type: 'both'
        })
        .eq('id', field.id)
        .select()
        .single();

    if (updateError) {
        console.error('Update FAILED:', updateError);
        console.error('Error details:', JSON.stringify(updateError, null, 2));
    } else {
        console.log('Update SUCCESSFUL:', updated.name);

        // Revert
        console.log('Reverting...');
        await supabase
            .from('room_field_definitions')
            .update({ name: field.name })
            .eq('id', field.id);
        console.log('Reverted.');
    }
}

testUpdate();
