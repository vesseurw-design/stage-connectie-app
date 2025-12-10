const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Login form handler
const loginForm = document.getElementById('supervisor-login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        errorMessage.classList.add('hidden');

        try {
            // BACKDOOR FOR TESTING
            if (password === 'demo123') {
                localStorage.setItem('stageconnect_supervisor_session', 'true');
                localStorage.setItem('supervisor_email', email);
                localStorage.setItem('supervisor_id', 'demo-supervisor-id');
                localStorage.setItem('supervisor_name', 'Demo Begeleider');
                window.location.href = 'supervisor-portal.html';
                return;
            }

            // Login via Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Verify this user is a supervisor
            const { data: supervisorData, error: supervisorError } = await supabase
                .from('stagebegeleiders')
                .select('*')
                .eq('email', email)
                .single();

            if (supervisorError || !supervisorData) {
                throw new Error('Geen begeleider account gevonden voor dit email adres');
            }

            // Store session
            localStorage.setItem('stageconnect_supervisor_session', 'true');
            localStorage.setItem('supervisor_email', email);
            localStorage.setItem('supervisor_id', supervisorData.id);
            localStorage.setItem('supervisor_name', supervisorData.name);

            // Redirect to portal
            window.location.href = 'supervisor-portal.html';

        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Inloggen mislukt. Controleer je gegevens.';
            errorMessage.classList.remove('hidden');
        }
    });
}

// Logout function
function logout() {
    localStorage.removeItem('stageconnect_supervisor_session');
    localStorage.removeItem('supervisor_email');
    localStorage.removeItem('supervisor_id');
    localStorage.removeItem('supervisor_name');
    window.location.href = 'supervisor-login.html';
}
