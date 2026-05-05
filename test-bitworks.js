
const { createClient } = require('@supabase/supabase-js');

// Config uit public/static/js/auth_v2.js (De "Live" config waarschijnlijk)
const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testBitWorks() {
    console.log('--- TEST LOGIN BIT-WORKS ---');
    console.log('Target Supabase:', SUPABASE_URL);

    const email = 'allertjan@bit-works.nl';
    const password = 'WelkomBit-Works'; // Exact zoals opgegeven

    // 1. Probeer in te loggen met Auth
    console.log(`\n1. Auth check voor: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (authError) {
        console.error('❌ Auth Failed:', authError.message);
        if (authError.message.includes('Invalid login credentials')) {
            console.log('   -> Wachtwoord onjuist of account bestaat niet in Auth.');
        }
    } else {
        console.log('✅ Auth Success!');
        console.log('   User ID:', authData.user.id);
        console.log('   Role:', authData.user.role);
        console.log('   Aud:', authData.user.aud);
        console.log('   Metadata:', authData.user.user_metadata);
    }

    // 2. Check Database entry (ongeacht of auth lukt, want misschien bestaat auth niet maar DB wel)
    console.log(`\n2. DB check in 'Bedrijven' tabel voor: ${email}`);

    // Eerst exact
    const { data: exactMatch, error: dbError1 } = await supabase
        .from('Bedrijven')
        .select('*')
        .eq('email', email);

    if (dbError1) console.error('   Error fetching exact:', dbError1.message);
    else if (exactMatch.length > 0) console.log('   ✅ Exact match found:', exactMatch[0]);
    else console.log('   ⚠️ No exact match found.');

    // Dan case-insensitive (mijn fix)
    const { data: ilikeMatch, error: dbError2 } = await supabase
        .from('Bedrijven')
        .select('*')
        .ilike('email', email);

    if (dbError2) console.error('   Error fetching ilike:', dbError2.message);
    else if (ilikeMatch.length > 0) console.log('   ✅ Case-insensitive match found:', ilikeMatch[0]);
    else console.log('   ❌ No case-insensitive match found either.');

    // 3. Lijst alle bedrijven om te zien of hij er überhaupt tussen staat (handig als email net anders gespeld is)
    console.log('\n3. Alle bedrijven email scan (first 20):');
    const { data: allCompanies, error: dbError3 } = await supabase.from('Bedrijven').select('company_name, email').limit(20);
    if (allCompanies) {
        allCompanies.forEach(c => {
            if (c.email && c.email.toLowerCase().includes('bit')) {
                console.log('   -> FOUND SIMILAR:', c);
            }
        });
    }
}

testBitWorks();
