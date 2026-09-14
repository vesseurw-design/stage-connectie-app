/**
 * Password Reset Functionality voor StageConnect
 * Gebruikt Supabase Auth voor veilige password reset
 */

const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const resetForm = document.getElementById('reset-form');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');
const successMessage = document.getElementById('success-message');
const successText = document.getElementById('success-text');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Form Submit Handler
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        // Validatie
        if (!email) {
            showError('Voer een geldig email adres in');
            return;
        }

        // Disable form
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
        hideMessages();

        try {
            // Check of het emailadres bij een student hoort (studenten mogen niet zelf resetten)
            const { data: student } = await supabaseClient
                .from('Students')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (student) {
                showError('Studenten kunnen hun wachtwoord niet zelf resetten. Neem contact op met je stagebegeleider om je wachtwoord te laten wijzigen.');
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
                return;
            }

            // Verstuur password reset email via StageConnectie Edge Function (Resend - StageConnectie afzender)
            const functionUrl = `${SUPABASE_URL}/functions/v1/create-auth-account`;
            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    action: 'request-password-reset',
                    email: email,
                    loginUrl: `${window.location.origin}/reset-password.html`
                })
            });

            const resData = await res.json();
            if (!res.ok || !resData.success) {
                throw new Error(resData?.error || 'Versturen van reset link mislukt.');
            }

            // Success
            showSuccess(
                `Een reset link is verstuurd naar ${email}. ` +
                `Controleer je inbox en volg de instructies. De link is 1 uur geldig.`
            );

            // Clear form
            emailInput.value = '';

            // Re-enable form after 3 seconds
            setTimeout(() => {
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
            }, 3000);

        } catch (error) {
            console.error('Password reset error:', error);

            // Toon generieke foutmelding (security best practice: niet onthullen of email bestaat)
            showError(
                'Er is een fout opgetreden bij het versturen van de reset link. ' +
                'Controleer of het email adres correct is en probeer het opnieuw.'
            );

            // Re-enable form
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    });
}

// Helper Functions
function showSuccess(message) {
    successText.textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');

    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// Auto-fill email from URL parameter (if coming from login page)
const urlParams = new URLSearchParams(window.location.search);
const emailParam = urlParams.get('email');
if (emailParam) {
    emailInput.value = emailParam;
}
