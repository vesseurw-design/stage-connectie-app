#!/usr/bin/env node
/**
 * apply-migrations.js
 * Applies Supabase SQL migrations via direct API calls.
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY env vars required');
    process.exit(1);
}

async function executeSql(sql) {
    try {
        // Use the sql RPC function (if available) or direct postgres call
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ sql })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    const migrations = [
        { file: 'migrations/001_create_profiles_and_roles.sql', name: '001 - Create profiles & roles' },
        { file: 'migrations/002_rls_policies.sql', name: '002 - RLS policies' }
    ];

    console.log(`🚀 Applying migrations to ${SUPABASE_URL}...\n`);

    for (const mig of migrations) {
        const filePath = path.join(__dirname, mig.file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Migration file not found: ${filePath}`);
            continue;
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`⏳ Applying: ${mig.name}`);

        const result = await executeSql(sql);
        if (result.success) {
            console.log(`✅ ${mig.name} applied successfully\n`);
        } else {
            console.error(`❌ ${mig.name} failed: ${result.error}\n`);
        }
    }

    console.log('✨ Migration process complete!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
