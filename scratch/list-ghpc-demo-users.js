const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukqogebsengneaqrlhrr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW9nZWJzZW5nbmVhcXJsaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzMzMzksImV4cCI6MjA5ODY0OTMzOX0.KJ_B8cinUY7b6OtUkF1EPmySw9GqGhQ1XvWj7SPh30s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        await supabase.auth.signInWithPassword({
            email: 'fake@leerling.nl',
            password: 'WelkomGHPC2026!'
        });
        const { data: students, error: sErr } = await supabase.from('Students').select('*');
        if (sErr) {
            console.error('Students error:', sErr);
        } else {
            console.log(`Total students: ${students.length}`);
            console.log('Students:', students.map(s => ({ name: s.name, email: s.email })));
        }
    } catch (e) {
        console.error(e);
    }
}

main();
