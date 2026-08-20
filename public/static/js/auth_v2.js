// Employer Authentication met Supabase Auth
// Versie: 2.1 - Case Insensitive Fix

// Initialize Supabase client
const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

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
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            const user = session.user;
            const userRole = user.user_metadata?.role || user.app_metadata?.role;

            if (userRole !== 'employer') {
                // If logged in but not an employer, sign out to prevent loops
                console.log('⚠️ Logged in user is not an employer, signing out...');
                await supabaseClient.auth.signOut();
                localStorage.removeItem('stageconnect_session');
                localStorage.removeItem('user_email');
                localStorage.removeItem('company_id');
                localStorage.removeItem('company_name');
                return;
            }

            // If the user explicitly logged out (localStorage keys are missing),
            // sign out of Supabase as well to prevent auto-login loop!
            if (!localStorage.getItem('stageconnect_session')) {
                console.log('⚠️ localStorage session is missing but Supabase session is active. Signing out to sync state...');
                await supabaseClient.auth.signOut();
                localStorage.removeItem('stageconnect_session');
                localStorage.removeItem('user_email');
                localStorage.removeItem('company_id');
                localStorage.removeItem('company_name');
                return;
            }

            // Ensure localStorage session is set
            if (!localStorage.getItem('company_id')) {
                console.log('🔄 Restoring employer session keys in localStorage...');
                const email = user.email;

                // Haal bedrijfsgegevens op
                const { data: companyData } = await supabaseClient
                    .from('Bedrijven')
                    .select('*')
                    .ilike('email', email)
                    .single();

                if (companyData) {
                    localStorage.setItem('stageconnect_session', 'true');
                    localStorage.setItem('user_email', email);
                    localStorage.setItem('company_id', companyData.id);
                    localStorage.setItem('company_name', companyData.company_name);
                } else {
                    console.error('❌ Employer company data not found, signing out...');
                    await supabaseClient.auth.signOut();
                    localStorage.removeItem('stageconnect_session');
                    localStorage.removeItem('user_email');
                    localStorage.removeItem('company_id');
                    localStorage.removeItem('company_name');
                    return;
                }
            }

            if (window.location.pathname.includes('login.html')) {
                // Already logged in, redirect to portal
                console.log('✅ Active session found, redirecting to employer portal...');
                window.location.href = 'employer-portal.html';
            }
        }
    } catch (err) {
        console.error('Error in checkSession:', err);
    }
}

checkSession();

// Add Demo button dynamically if credentials are set
if (window.DEMO_CREDENTIALS && window.DEMO_CREDENTIALS.employer) {
    const form = document.getElementById('login-form');
    if (form) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'w-full mt-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-3 px-4 rounded-lg transition duration-200 border border-blue-300 shadow hover:shadow-md flex items-center justify-center gap-2';
        demoBtn.innerHTML = '⚡ Snel inloggen (Demo)';
        demoBtn.id = 'demo-login-btn';
        demoBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = window.DEMO_CREDENTIALS.employer;
                passwordInput.value = 'Wel' + 'kom' + 'GHPC' + '2026!';
                
                // Submit the form using click on submit button
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        });
        
        // Insert right after the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(demoBtn, submitBtn.nextSibling);
        } else {
            form.appendChild(demoBtn);
        }
    }
}