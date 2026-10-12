
/**
 * Student Authentication - Stability-first pattern (MATCHES WORKING ADMIN)
 */

const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

// Use the exact SAME initialization as Admin
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

(async function autoPurgeStaleStudentDemoSession() {
    const isDemoExplicit = sessionStorage.getItem('demo_unlocked') === 'true' || 
                           new URLSearchParams(window.location.search).get('demo') === 'unlocked';
    const storedEmail = localStorage.getItem('student_email');
    const { data: { session } } = await supabaseClient.auth.getSession().catch(() => ({ data: { session: null } }));
    const isDemoUser = (session && session.user && session.user.email === 'fake@leerling.nl') || storedEmail === 'fake@leerling.nl';

    if (!isDemoExplicit && isDemoUser) {
        console.log('🧹 Purging stale student demo session...');
        localStorage.removeItem('student_email');
        localStorage.removeItem('stageconnect_student_session');
        sessionStorage.removeItem('demo_unlocked');
        if (session) {
            await supabaseClient.auth.signOut().catch(() => {});
        }
    }
})();

const loginForm = document.getElementById('student-login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value.trim();

        errorMessage.classList.add('hidden');

        try {
            console.log('🔐 Attempting student login for:', email);

            // Step 1: Login via Auth
            let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            console.log('✅ Auth success, session created');

            // Step 3: Store basic student info (and clear any previous employer session)
            localStorage.removeItem('stageconnect_session');
            localStorage.removeItem('user_email');
            localStorage.removeItem('company_id');
            localStorage.removeItem('company_name');
            localStorage.setItem('stageconnect_student_session', 'true');
            localStorage.setItem('student_email', email);

            // Redirect immediately to the portal
            window.location.href = 'student-portal.html';

        } catch (error) {
            console.error('❌ Login error:', error);
            let friendlyError = error.message || 'Inloggen mislukt.';
            if (friendlyError.includes('Invalid login credentials')) {
                friendlyError = 'Onjuist e-mailadres of wachtwoord. Controleer je gegevens of neem contact op met je stagebegeleider.';
            }
            errorMessage.textContent = friendlyError;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Add Demo button dynamically only when demo access is explicitly unlocked
function setupStudentDemoButton() {
    const urlCode = new URLSearchParams(window.location.search).get('code');
    const isDemoUnlocked = sessionStorage.getItem('demo_unlocked') === 'true' || 
                           new URLSearchParams(window.location.search).get('demo') === 'unlocked' ||
                           (typeof window.validateDemoCode === 'function' && urlCode ? window.validateDemoCode(urlCode) : false);

    const studentDemoEmail = (window.DEMO_CREDENTIALS && window.DEMO_CREDENTIALS.student) || 'fake@leerling.nl';
    const form = document.getElementById('student-login-form');

    if (isDemoUnlocked && form && !document.getElementById('demo-login-btn')) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'w-full mt-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold py-3 px-4 rounded-lg transition duration-200 border border-purple-300 shadow hover:shadow-md flex items-center justify-center gap-2 cursor-pointer';
        demoBtn.innerHTML = '⚡ Snel inloggen (Demo Stagiair)';
        demoBtn.id = 'demo-login-btn';
        demoBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = studentDemoEmail;
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
    } else if (!isDemoUnlocked && !document.getElementById('demo-unlock-link')) {
        const linksContainer = document.querySelector('.mt-6.text-center');
        if (linksContainer) {
            const demoLink = document.createElement('a');
            demoLink.id = 'demo-unlock-link';
            demoLink.href = 'student-login.html?demo=unlocked';
            demoLink.className = 'block text-xs text-purple-600 hover:text-purple-800 underline mt-4';
            demoLink.textContent = 'Demo-omgeving bekijken (zonder account) →';
            linksContainer.appendChild(demoLink);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStudentDemoButton);
} else {
    setupStudentDemoButton();
}

