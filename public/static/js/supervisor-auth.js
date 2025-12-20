/**
 * Nieuwe Supervisor Auth met Supabase Auth
 * Versie: 2.0 - Secure Authentication
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('supervisor-login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        errorMessage.classList.add('hidden');

        try {
            console.log('🔐 Attempting supervisor login...');

            // Login via Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
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

            // Controleer of dit een supervisor is
            if (userRole !== 'supervisor') {
                throw new Error('Dit account is geen stagebegeleider account. Gebruik de juiste login pagina.');
            }

            // Haal supervisor data op uit database
            const supervisorId = user.user_metadata?.supervisor_id;

            if (!supervisorId) {
                throw new Error('Supervisor ID niet gevonden. Neem contact op met de beheerder.');
            }

            const { data: supervisorData, error: supervisorError } = await supabaseClient
                .from('stagebegeleiders')
                .select('*')
                .eq('id', supervisorId)
                .single();

            if (supervisorError || !supervisorData) {
                throw new Error('Supervisor gegevens niet gevonden.');
            }

            console.log('✅ Supervisor data loaded:', supervisorData);

            // Store session data
            localStorage.setItem('stageconnect_supervisor_session', 'true');
            localStorage.setItem('supervisor_email', user.email);
            localStorage.setItem('supervisor_id', supervisorData.id);
            localStorage.setItem('supervisor_name', supervisorData.name);
            localStorage.setItem('auth_user_id', user.id);

            // Remember me functionaliteit
            if (rememberMe) {
                localStorage.setItem('remember_supervisor_email', email);
            } else {
                localStorage.removeItem('remember_supervisor_email');
            }

            console.log('✅ Session stored, redirecting to portal...');

            // Redirect to portal
            window.location.href = 'supervisor-portal.html';

        } catch (error) {
            console.error('❌ Login error:', error);

            let errorMsg = 'Inloggen mislukt. Controleer je gegevens.';

            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Onjuist email adres of wachtwoord.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Je email adres is nog niet bevestigd. Check je inbox.';
            } else if (error.message.includes('geen stagebegeleider')) {
                errorMsg = error.message;
            } else if (error.message.includes('Supervisor')) {
                errorMsg = error.message;
            }

            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Auto-fill email if "remember me" was checked
window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('remember_supervisor_email');
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

// Logout function (voor gebruik op andere pagina's)
function logout() {
    // Sign out van Supabase Auth
    supabaseClient.auth.signOut();

    // Clear local storage
    localStorage.removeItem('stageconnect_supervisor_session');
    localStorage.removeItem('supervisor_email');
    localStorage.removeItem('supervisor_id');
    localStorage.removeItem('supervisor_name');
    localStorage.removeItem('auth_user_id');

    // Redirect to login
    window.location.href = 'supervisor-login.html';
}

// Maak logout beschikbaar globaal
window.supervisorLogout = logout;
