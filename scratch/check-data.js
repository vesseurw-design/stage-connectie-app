const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ukqogebsengneaqrlhrr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW9nZWJzZW5nbmVhcXJsaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzMzMzksImV4cCI6MjA5ODY0OTMzOX0.KJ_B8cinUY7b6OtUkF1EPmySw9GqGhQ1XvWj7SPh30s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Logging in...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'wvs@youscope.nl',
        password: 'WelkomStagebegeleider'
    });

    if (loginError) {
        console.error('Login failed:', loginError.message);
        return;
    }

    console.log('Login successful! Fetching students...');
    const { data: students, error: studentError } = await supabase.from('Students').select('*');
    if (studentError) {
        console.error('Error fetching students:', studentError.message);
        return;
    }

    const fakeStudent = students.find(s => s.name.toLowerCase().includes('fake'));
    if (!fakeStudent) {
        console.log('Fake Leerling not found in Students table!');
        console.log('All students:', students.map(s => `${s.id}: ${s.name}`));
        return;
    }

    console.log(`Found Fake Student: ID = ${fakeStudent.id}, Name = ${fakeStudent.name}`);

    console.log('Fetching attendance records...');
    const { data: attendance, error: attendanceError } = await supabase
        .from('Attendance')
        .select('*')
        .eq('student_id', fakeStudent.id)
        .order('date', { ascending: true });

    if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError.message);
        return;
    }

    console.log(`\nAttendance records for ${fakeStudent.name}:`);
    console.log('----------------------------------------------------');
    attendance.forEach(rec => {
        console.log(`Date: ${rec.date} | student_status: ${rec.student_status} | student_hours: ${rec.student_hours} | status: ${rec.status} | hours_worked: ${rec.hours_worked} | created_by: ${rec.updated_by_role || 'unknown'}`);
    });
    console.log('----------------------------------------------------');
}

main().catch(err => {
    console.error('Fatal error:', err);
});
