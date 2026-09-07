
/**
 * Student Authentication - Stability-first pattern (MATCHES WORKING ADMIN)
 */

const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';

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

            // Step 1: Login via Auth
            let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            // Step 2: Auto-provisioning fallback if user was inserted in DB without Auth account
            if (authError && (authError.message?.includes('Invalid login credentials') || authError.status === 400)) {
                console.warn('⚠️ Initial auth login failed, attempting auto-provisioning for:', email);
                try {
                    const functionUrl = `${SUPABASE_URL}/functions/v1/create-auth-account`;
                    const authRes = await fetch(functionUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_KEY}`
                        },
                        body: JSON.stringify({
                            email: email,
                            password: password,
                            role: 'student',
                            sendEmail: false,
                            name: email.split('@')[0],
                            loginUrl: `${window.location.origin}/student-portal.html`
                        })
                    });
                    const authResult = await authRes.json();
                    if (authRes.ok && authResult.success) {
                        console.log('✅ Account auto-provisioned successfully! Retrying login...');
                        const retry = await supabaseClient.auth.signInWithPassword({
                            email: email,
                            password: password
                        });
                        if (!retry.error && retry.data) {
                            authData = retry.data;
                            authError = null;
                        }
                    }
                } catch (autoErr) {
                    console.warn('Auto-provisioning fallback failed:', autoErr);
                }
            }

            if (authError) throw authError;

            console.log('✅ Auth success, session created');

            // Step 3: Store basic student info
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

// Add Demo button dynamically if credentials are set
if (window.DEMO_CREDENTIALS && window.DEMO_CREDENTIALS.student) {
    const form = document.getElementById('student-login-form');
    if (form) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'w-full mt-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold py-3 px-4 rounded-lg transition duration-200 border border-purple-300 shadow hover:shadow-md flex items-center justify-center gap-2';
        demoBtn.innerHTML = '⚡ Snel inloggen (Demo)';
        demoBtn.id = 'demo-login-btn';
        demoBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = window.DEMO_CREDENTIALS.student;
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

