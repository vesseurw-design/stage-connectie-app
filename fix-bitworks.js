
const { createClient } = require('@supabase/supabase-js');

// Config uit public/static/js/auth_v2.js
const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
// LET OP: Hiervoor hebben we eigenlijk de SERVICE_ROLE_KEY nodig om users aan te maken
// Maar die heb ik waarschijnlijk niet. Ik probeer het met de anon key via signUp, 
// en hoop dat email confirmation uit staat of dat het werkt.
// Anders moet de gebruiker dit handmatig in het dashboard doen of mij de service key geven.

// Echter, 'signUp' met anon key stuurt meestal een confirm mail.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixBitWorks() {
    console.log('--- FIX BIT-WORKS ACCOUNT ---');
    const email = 'allertjan@bit-works.nl';
    const password = 'WelkomBit-Works';

    console.log(`Pogen account aan te maken voor: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                role: 'employer',
                company_name: 'Bit-Works'
            }
        }
    });

    if (error) {
        console.error('❌ SignUp Failed:', error.message);
    } else {
        console.log('✅ SignUp Success (of mail verstuurd):', data);
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            console.log('⚠️ Let op: User bestond al, maar wachtwoord is niet gewijzigd door signUp.');
            console.log('   Als het wachtwoord verkeerd was, is het nog steeds verkeerd.');
        } else if (data.session) {
            console.log('🎉 Direct ingelogd! Account is aangemaakt en werkt.');
        } else {
            console.log('📧 Bevestigingsmail verstuurd (waarschijnlijk). Account is nog niet actief.');
        }
    }
}

fixBitWorks();
