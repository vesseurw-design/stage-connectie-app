/**
 * Reset Password Handler voor StageConnect
 * Verwerkt het daadwerkelijk wijzigen van het wachtwoord
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const resetForm = document.getElementById('reset-password-form');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const togglePasswordBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

// Password Requirements Elements
const reqLength = document.getElementById('req-length');
const reqUppercase = document.getElementById('req-uppercase');
const reqLowercase = document.getElementById('req-lowercase');
const reqNumber = document.getElementById('req-number');

// Toggle Password Visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    // Update icon
    if (type === 'text') {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        `;
    } else {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
    }
});

// Password Strength Checker
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);
    updatePasswordStrength(strength);
    updateRequirements(password);
});

function calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

    return Math.min(strength, 100);
}

function updatePasswordStrength(strength) {
    let color, text;

    if (strength < 40) {
        color = '#ef4444'; // red
        text = 'Zwak';
    } else if (strength < 70) {
        color = '#f59e0b'; // orange
        text = 'Gemiddeld';
    } else if (strength < 90) {
        color = '#10b981'; // green
        text = 'Sterk';
    } else {
        color = '#059669'; // dark green
        text = 'Zeer Sterk';
    }

    strengthBar.style.width = strength + '%';
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function updateRequirements(password) {
    // Length
    updateRequirement(reqLength, password.length >= 8);

    // Uppercase
    updateRequirement(reqUppercase, /[A-Z]/.test(password));

    // Lowercase
    updateRequirement(reqLowercase, /[a-z]/.test(password));

    // Number
    updateRequirement(reqNumber, /[0-9]/.test(password));
}

function updateRequirement(element, met) {
    const bullet = element.querySelector('span');
    if (met) {
        bullet.textContent = '✓';
        bullet.style.color = '#10b981';
        element.style.color = '#10b981';
    } else {
        bullet.textContent = '○';
        bullet.style.color = '#6b7280';
        element.style.color = '#6b7280';
    }
}

// Validate Password
function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Wachtwoord moet minimaal 8 karakters bevatten');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 hoofdletter bevatten');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 kleine letter bevatten');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Wachtwoord moet minimaal 1 cijfer bevatten');
    }

    return errors;
}

// Form Submit Handler
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    // Validatie
    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
        showError(validationErrors.join('. '));
        return;
    }

    if (password !== passwordConfirm) {
        showError('Wachtwoorden komen niet overeen');
        return;
    }

    // Disable form
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    hideMessages();

    try {
        // Update password via Supabase Auth
        const { data, error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            throw error;
        }

        // Success
        showSuccess();

        // Redirect to login after 2 seconds
        setTimeout(() => {
            // Determine which login page based on user role
            const userRole = data.user?.user_metadata?.role || 'supervisor';

            if (userRole === 'admin') {
                window.location.href = 'admin-login.html';
            } else if (userRole === 'employer') {
                window.location.href = 'index.html';
            } else {
                window.location.href = 'supervisor-login.html';
            }
        }, 2000);

    } catch (error) {
        console.error('Password reset error:', error);

        let errorMsg = 'Er is een fout opgetreden bij het wijzigen van je wachtwoord.';

        if (error.message.includes('expired')) {
            errorMsg = 'De reset link is verlopen. Vraag een nieuwe reset link aan.';
        } else if (error.message.includes('invalid')) {
            errorMsg = 'De reset link is ongeldig. Vraag een nieuwe reset link aan.';
        }

        showError(errorMsg);

        // Re-enable form
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
});

// Helper Functions
function showSuccess() {
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// Check if user has valid reset token
window.addEventListener('load', async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            showError('Geen geldige reset link gevonden. Vraag een nieuwe reset link aan.');
            submitBtn.disabled = true;
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
});
