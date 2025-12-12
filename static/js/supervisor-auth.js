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

            // Login via Database (Simple Table Auth)
            // We search for a supervisor with matching email AND password
            const { data: supervisorData, error: supervisorError } = await supabase
                .from('stagebegeleiders')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (supervisorError) {
                // Try checking capitalized table name if lowercase fails (just in case)
                const { data: supervisorDataCap, error: supervisorErrorCap } = await supabase
                    .from('Stagebegeleiders')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .single();

                if (supervisorErrorCap || !supervisorDataCap) {
                    throw new Error('Ongeldig email of wachtwoord');
                } else {
                    // Found in capitalized table
                    proceedLogin(supervisorDataCap);
                    return;
                }
            }

            // Found in lowercase table
            proceedLogin(supervisorData);
            return;

            function proceedLogin(user) {
                // Store session
                localStorage.setItem('stageconnect_supervisor_session', 'true');
                localStorage.setItem('supervisor_email', user.email);
                localStorage.setItem('supervisor_id', user.id);
                localStorage.setItem('supervisor_name', user.name);

                // Redirect to portal
                window.location.href = 'supervisor-portal.html';
            }

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
