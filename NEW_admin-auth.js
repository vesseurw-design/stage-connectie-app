/**
 * Nieuwe Admin Auth met Supabase Auth
 * Versie: 2.0 - Secure Authentication
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;

        loginError.classList.add('hidden');

        try {
            console.log('🔐 Attempting admin login...');

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

            // Controleer of dit een admin is
            if (userRole !== 'admin') {
                throw new Error('Dit account heeft geen admin rechten. Gebruik de juiste login pagina.');
            }

            console.log('✅ Admin access confirmed');

            // Store session data
            localStorage.setItem('stageconnect_admin_session', 'true');
            localStorage.setItem('admin_email', user.email);
            localStorage.setItem('admin_name', user.user_metadata?.name || 'Admin');
            localStorage.setItem('auth_user_id', user.id);

            console.log('✅ Session stored, redirecting to admin panel...');

            // Redirect to admin panel
            window.location.href = 'admin-students.html';

        } catch (error) {
            console.error('❌ Login error:', error);

            let errorMsg = 'Inloggen mislukt. Controleer je gegevens.';

            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Onjuist email adres of wachtwoord.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Je email adres is nog niet bevestigd.';
            } else if (error.message.includes('geen admin')) {
                errorMsg = error.message;
            }

            loginError.textContent = errorMsg;
            loginError.classList.remove('hidden');
        }
    });
}

// Logout function
function adminLogout() {
    // Sign out van Supabase Auth
    supabase.auth.signOut();

    // Clear local storage
    localStorage.removeItem('stageconnect_admin_session');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('auth_user_id');

    // Redirect to login
    window.location.href = 'admin-login.html';
}

// Maak logout beschikbaar globaal
window.adminLogout = adminLogout;

// Check admin session on protected pages
function checkAdminSession() {
    const session = localStorage.getItem('stageconnect_admin_session');

    if (!session) {
        console.log('⚠️ No admin session found, redirecting to login...');
        window.location.href = 'admin-login.html';
        return false;
    }

    return true;
}

// Maak check functie beschikbaar
window.checkAdminSession = checkAdminSession;
