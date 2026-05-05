
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function describeTables() {
    const tables = ['Students', 'Attendance', 'Bedrijven', 'stagebegeleiders'];
    
    for (const table of tables) {
        console.log(`\n--- TABLE: ${table} ---`);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot determine columns from select *');
        }
    }
}

describeTables();
