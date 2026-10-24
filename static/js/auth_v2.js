// Employer Authentication met Supabase Auth
// Versie: 2.1 - Case Insensitive Fix

// Initialize Supabase client
const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
let isPasswordMode = false;

window.togglePasswordMode = function (forcePassword) {
    const pwSection = document.getElementById('password-section');
    const pwInput = document.getElementById('password');
    const submitBtn = document.getElementById('login-submit-btn');
    const toggleBtn = document.getElementById('toggle-password-mode-btn');

    isPasswordMode = typeof forcePassword === 'boolean' ? forcePassword : !isPasswordMode;

    if (errorMessage) errorMessage.classList.add('hidden');
    if (successMessage) successMessage.classList.add('hidden');

    if (isPasswordMode) {
        if (pwSection) pwSection.classList.remove('hidden');
        if (pwInput) pwInput.required = true;
        if (submitBtn) submitBtn.innerHTML = '🔑 Inloggen met Wachtwoord';
        if (toggleBtn) toggleBtn.textContent = '← Terug naar inloggen zonder wachtwoord (via e-mail)';
    } else {
        if (pwSection) pwSection.classList.add('hidden');
        if (pwInput) {
            pwInput.required = false;
            pwInput.value = '';
        }
        if (submitBtn) submitBtn.innerHTML = '✉️ Stuur Directe Inloglink (Geen wachtwoord)';
        if (toggleBtn) toggleBtn.textContent = 'Liever inloggen met een wachtwoord?';
    }
};

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password')?.value || '';
        const rememberMe = document.getElementById('remember-me')?.checked ?? true;
        const submitBtn = document.getElementById('login-submit-btn') || loginForm.querySelector('button[type="submit"]');

        if (errorMessage) errorMessage.classList.add('hidden');
        if (successMessage) successMessage.classList.add('hidden');

        // Default: Wachtwoordloos inloggen (tenzij wachtwoord-modus actief is en een wachtwoord is ingevuld)
        if (!isPasswordMode && !password) {
            const origText = submitBtn ? submitBtn.innerHTML : '';
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '⏳ Inloglink wordt verstuurd...';
                }

                const originUrl = (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
                    ? 'https://ghpc.stageconnectie.nl'
                    : window.location.origin;

                const res = await fetch(`${SUPABASE_URL}/functions/v1/create-auth-account`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    },
                    body: JSON.stringify({
                        action: 'request-employer-magic-link',
                        email: email,
                        portalUrl: `${originUrl}/employer-portal.html`,
                        schoolName: window.SCHOOL_NAME || 'Groene Hart Pro College'
                    })
                });

                const result = await res.json();
                if (!res.ok || !result.success) {
                    throw new Error(result?.error || 'Kon inloglink niet versturen.');
                }

                localStorage.setItem('remember_employer_email', email);

                if (successMessage) {
                    successMessage.innerHTML = `
                        <div class="font-bold text-green-900 mb-1">✅ Directe inloglink verstuurd naar ${email}!</div>
                        <p class="text-xs text-green-800">Open uw e-mail en klik op de blauwe knop <strong>"Direct Inloggen"</strong>. U bent dan meteen ingelogd zonder wachtwoord.</p>
                    `;
                    successMessage.classList.remove('hidden');
                }
            } catch (err) {
                console.error('❌ Magic link error:', err);
                if (errorMessage) {
                    errorMessage.textContent = err.message || 'Kon inloglink niet versturen. Controleer uw e-mailadres.';
                    errorMessage.classList.remove('hidden');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = origText || '✉️ Stuur Directe Inloglink (Geen wachtwoord)';
                }
            }
            return;
        }

        try {
            console.log('🔐 Attempting employer password login...');

            // Login met Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                throw authError;
            }

            console.log('✅ Auth successful:', authData.user.email);

            // Haal bedrijfsgegevens op via company_id in metadata of via email matching
            const metaCompanyId = authData.user.user_metadata?.company_id || authData.user.app_metadata?.company_id;
            let companyData = null;
            let companyError = null;

            if (metaCompanyId) {
                const res = await supabaseClient
                    .from('Bedrijven')
                    .select('*')
                    .eq('id', metaCompanyId)
                    .maybeSingle();
                companyData = res.data;
                companyError = res.error;
            }

            if (!companyData) {
                const res = await supabaseClient
                    .from('Bedrijven')
                    .select('*')
                    .ilike('email', email)
                    .maybeSingle();
                companyData = res.data;
                companyError = res.error;
            }

            const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
            if (!companyData && userRole !== 'employer') {
                throw new Error('Dit account is geen werkgever account. Gebruik de juiste login pagina.');
            }

            if (!companyData) {
                console.error('Company fetch error:', companyError);
                throw new Error('Bedrijfsgegevens niet gevonden. Controleer of je e-mailadres exact overeenkomt met de registratie.');
            }

            console.log('✅ Company data loaded:', companyData.company_name);

            // Store session
            sessionStorage.removeItem('demo_unlocked');
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
                errorMsg = 'Onjuist email adres of wachtwoord. Tip: kies voor inloggen zonder wachtwoord via e-mail!';
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

        // Auto purge removed to keep demo environment accessible

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

                // Haal bedrijfsgegevens op via company_id in metadata of email matching
                const metaCompanyId = user.user_metadata?.company_id || user.app_metadata?.company_id;
                let companyData = null;

                if (metaCompanyId) {
                    const { data } = await supabaseClient
                        .from('Bedrijven')
                        .select('*')
                        .eq('id', metaCompanyId)
                        .maybeSingle();
                    companyData = data;
                }

                if (!companyData) {
                    const { data } = await supabaseClient
                        .from('Bedrijven')
                        .select('*')
                        .ilike('email', email)
                        .maybeSingle();
                    companyData = data;
                }

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

            const isEmployerLoginPage = (window.location.pathname.endsWith('/login.html') || window.location.pathname === '/login.html' || window.location.pathname.endsWith('/login')) && !window.location.pathname.includes('student') && !window.location.pathname.includes('supervisor') && !window.location.pathname.includes('admin');
            if (isEmployerLoginPage) {
                // Already logged in as employer, redirect to employer portal
                console.log('✅ Active employer session found, redirecting to employer portal...');
                window.location.href = 'employer-portal.html';
            }
        }
    } catch (err) {
        console.error('Error in checkSession:', err);
    }
}

checkSession();

// Add Demo button dynamically if credentials are set
function setupEmployerDemoButton() {
    const employerDemoEmail = (window.DEMO_CREDENTIALS && window.DEMO_CREDENTIALS.employer) || 'test@testbedrijf.nl';
    const form = document.getElementById('login-form');

    if (form && !document.getElementById('demo-login-btn')) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'w-full mt-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-3 px-4 rounded-lg transition duration-200 border border-blue-300 shadow hover:shadow-md flex items-center justify-center gap-2 cursor-pointer';
        demoBtn.innerHTML = '⚡ Snel inloggen (Demo Stagebedrijf)';
        demoBtn.id = 'demo-login-btn';
        demoBtn.addEventListener('click', async () => {
            sessionStorage.setItem('demo_unlocked', 'true');
            if (typeof window.togglePasswordMode === 'function') {
                window.togglePasswordMode(true);
            }
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = employerDemoEmail;
                passwordInput.value = 'WelkomGHPC2026!';
                
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        });
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(demoBtn, submitBtn.nextSibling);
        } else {
            form.appendChild(demoBtn);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEmployerDemoButton);
} else {
    setupEmployerDemoButton();
}