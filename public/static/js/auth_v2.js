// Employer Authentication met Supabase Auth
// Versie: 2.0 - GDPR Compliant

// Initialize Supabase client
const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

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
            const userRole = authData.user.user_metadata?.role;
            if (userRole !== 'employer') {
                throw new Error('Dit account is geen werkgever account. Gebruik de juiste login pagina.');
            }

            // Haal bedrijfsgegevens op via email
            const { data: companyData, error: companyError } = await supabaseClient
                .from('Bedrijven')
                .select('*')
                .eq('email', email)
                .single();

            if (companyError || !companyData) {
                throw new Error('Bedrijfsgegevens niet gevonden.');
            }

            console.log('✅ Company data loaded:', companyData.company_name);

            // Store session
            localStorage.setItem('stageconnect_session', 'true');
            localStorage.setItem('user_email', email);
            localStorage.setItem('company_id', companyData.id);
            localStorage.setItem('company_name', companyData.company_name);

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
            }

            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Check if already logged in
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && window.location.pathname.includes('login.html')) {
        // Already logged in, redirect to portal
        window.location.href = 'employer-portal.html';
    }
}

checkSession();