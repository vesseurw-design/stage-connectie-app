/**
 * Password Reset Functionality voor StageConnect
 * Gebruikt Supabase Auth voor veilige password reset
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
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
            // Verstuur password reset email via Supabase Auth
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) {
                throw error;
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
