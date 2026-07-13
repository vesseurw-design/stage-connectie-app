const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const oldSupabase = createClient(OLD_URL, OLD_KEY);

async function countData() {
    const tables = ['Students', 'Bedrijven', 'stagebegeleiders', 'Attendance', 'Vakanties'];
    console.log('📊 Aantal records in huidige database:');
    
    for (const table of tables) {
        const { count, error } = await oldSupabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            console.error(`❌ Fout bij ${table}:`, error.message);
        } else {
            console.log(`- ${table}: ${count} records`);
        }
    }
}

countData();
