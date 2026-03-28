// Employer Authentication met Supabase Auth
// Versie: 2.1 - Case Insensitive Fix

// Initialize Supabase client
const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // FIX: Trim input to remove accidental spaces
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        errorMessage.classList.add('hidden');

        try {
            console.log('🔐 Attempting employer login...');

            // Login met Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                throw authError;
            }

            console.log('✅ Auth successful:', authData.user.email);

            // Check if user is employer
            const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
            if (userRole !== 'employer') {
                throw new Error('Dit account is geen werkgever account. Gebruik de juiste login pagina.');
            }

            // Haal bedrijfsgegevens op via email
            // FIX: Use ilike for case-insensitive matching
            const { data: companyData, error: companyError } = await supabaseClient
                .from('Bedrijven')
                .select('*')
                .ilike('email', email)
                .single();

            if (companyError || !companyData) {
                console.error('Company fetch error:', companyError);
                throw new Error('Bedrijfsgegevens niet gevonden. Controleer of je email exact overeenkomt.');
            }

            console.log('✅ Company data loaded:', companyData.company_name);

            // Store session
            localStorage.setItem('stageconnect_session', 'true');
            localStorage.setItem('user_email', email);
            localStorage.setItem('company_id', companyData.id);
            localStorage.setItem('company_name', companyData.company_name);

            // Remember me functionaliteit
            if (rememberMe) {
                localStorage.setItem('remember_employer_email', email);
            } else {
                localStorage.removeItem('remember_employer_email');
            }

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
            } else if (error.message.includes('Bedrijfsgegevens')) {
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

// Check if already logged in
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && window.location.pathname.includes('login.html')) {
        // Already logged in, redirect to portal
        window.location.href = 'employer-portal.html';
    }
}

checkSession();