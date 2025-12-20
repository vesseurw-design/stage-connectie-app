/**
 * Nieuwe Employer Auth met Supabase Auth
 * Versie: 2.0 - Secure Authentication
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Sync data function - haal data op voor employer
async function syncData(userEmail, companyId) {
    try {
        console.log('📊 Syncing data for company:', companyId);

        // Haal bedrijfsgegevens op
        const { data: companyData, error: companyError } = await supabase
            .from('Bedrijven')
            .select('*')
            .eq('id', companyId)
            .single();

        if (companyError) throw companyError;

        // Sla bedrijfsgegevens op
        localStorage.setItem('sc_selected_employer', companyId);
        localStorage.setItem('sc_company_data', JSON.stringify(companyData));

        // Haal studenten op voor dit bedrijf
        const { data: studentsData, error: studentsError } = await supabase
            .from('Students')
            .select('*')
            .eq('company_id', companyId);

        if (studentsError) throw studentsError;

        // Map students data
        const students = studentsData.map(s => ({
            id: s.name,
            name: s.name,
            studentNumber: s.student_number,
            companyId: s.company_id,
            level: s.level,
            startDate: s.start_date,
            endDate: s.end_date
        }));

        localStorage.setItem('sc_students', JSON.stringify(students));

        console.log('✅ Data synced:', {
            company: companyData.company_name,
            students: students.length
        });

    } catch (error) {
        console.error('❌ Data sync error:', error);
        throw error;
    }
}

// Save attendance to Supabase
async function saveAttendanceToSupabase(attendanceRecord) {
    try {
        const { data, error } = await supabase
            .from('Attendance')
            .insert([{
                student_id: attendanceRecord.studentId,
                employer_id: attendanceRecord.employerId,
                date: attendanceRecord.date,
                status: attendanceRecord.status,
                minutes_late: attendanceRecord.minutesLate || 0
            }]);

        if (error) {
            return { success: false, error: error };
        }

        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error };
    }
}

// Maak functie globaal beschikbaar
window.saveAttendanceToSupabase = saveAttendanceToSupabase;

// Login form handler
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        errorMessage.classList.add('hidden');

        try {
            console.log('🔐 Attempting employer login...');

            // Login via Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                throw authError;
            }

            console.log('✅ Auth successful:', authData);

            // Haal user metadata op
            const user = authData.user;
            const userRole = user.user_metadata?.role;

            // Controleer of dit een employer is
            if (userRole !== 'employer') {
                throw new Error('Dit account is geen werkgever account. Gebruik de juiste login pagina.');
            }

            // Haal company data op
            const companyId = user.user_metadata?.company_id;

            if (!companyId) {
                throw new Error('Bedrijfs ID niet gevonden. Neem contact op met de beheerder.');
            }

            const { data: companyData, error: companyError } = await supabase
                .from('Bedrijven')
                .select('*')
                .eq('id', companyId)
                .single();

            if (companyError || !companyData) {
                throw new Error('Bedrijfsgegevens niet gevonden.');
            }

            console.log('✅ Company data loaded:', companyData);

            // Store session data
            localStorage.setItem('stageconnect_session', 'true');
            localStorage.setItem('user_email', user.email);
            localStorage.setItem('company_id', companyData.id);
            localStorage.setItem('company_name', companyData.company_name);
            localStorage.setItem('auth_user_id', user.id);

            // Remember me functionaliteit
            if (rememberMe) {
                localStorage.setItem('remember_employer_email', email);
            } else {
                localStorage.removeItem('remember_employer_email');
            }

            // Sync data
            await syncData(user.email, companyData.id);

            console.log('✅ Session stored, redirecting to portal...');

            // Redirect to portal
            window.location.href = 'employer-portal.html';

        } catch (error) {
            console.error('❌ Login error:', error);

            let errorMsg = 'Inloggen mislukt. Controleer je gegevens.';

            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Onjuist email adres of wachtwoord.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Je email adres is nog niet bevestigd. Check je inbox.';
            } else if (error.message.includes('geen werkgever')) {
                errorMsg = error.message;
            } else if (error.message.includes('Bedrijfs')) {
                errorMsg = error.message;
            }

            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Auto-fill email if "remember me" was checked
window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('remember_employer_email');
    if (rememberedEmail) {
        const emailInput = document.getElementById('email');
        const rememberCheckbox = document.getElementById('remember-me');

        if (emailInput) {
            emailInput.value = rememberedEmail;
        }
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
});

// Logout function
function logout() {
    // Sign out van Supabase Auth
    supabase.auth.signOut();

    // Clear local storage
    localStorage.removeItem('stageconnect_session');
    localStorage.removeItem('user_email');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('sc_selected_employer');
    localStorage.removeItem('sc_company_data');
    localStorage.removeItem('sc_students');

    // Redirect to login
    window.location.href = 'login.html';
}

// Maak logout beschikbaar globaal
window.employerLogout = logout;
