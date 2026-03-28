
/**
 * Student Authentication - Stability-first pattern (MATCHES WORKING ADMIN)
 */

const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

// Use the exact SAME initialization as Admin
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById('student-login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorMessage.classList.add('hidden');

        try {
            console.log('🔐 Attempting student login for:', email);

            // Step 1: Login via Auth (identical to Admin)
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            console.log('✅ Auth success, session created');

            // Step 2: Store basic student info (without schema query first)
            localStorage.setItem('stageconnect_student_session', 'true');
            localStorage.setItem('student_email', email);

            // Redirect immediately to the portal (which will handle the rest)
            window.location.href = 'student-portal.html';

        } catch (error) {
            console.error('❌ Login error:', error);
            errorMessage.textContent = error.message || 'Inloggen mislukt.';
            errorMessage.classList.remove('hidden');
        }
    });
}
