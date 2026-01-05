/**
 * Admin Branches Management
 * Beheer standaard en custom branches
 */

const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load branches
async function loadBranches() {
    const { data, error } = await supabaseClient
        .from('Branches')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error loading branches:', error);
        return;
    }

    // All branches are standard (no custom branches in new schema)
    const standardBranches = data;
    const customBranches = [];

    // Display standard branches
    const standardContainer = document.getElementById('standard-branches');
    standardContainer.innerHTML = '';

    standardBranches.forEach(branch => {
        standardContainer.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <span class="font-medium text-gray-800">${branch.name}</span>
                </div>
                <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded">Standaard</span>
            </div>
        `;
    });

    // Display custom branches
    const customContainer = document.getElementById('custom-branches');
    customContainer.innerHTML = '';

    customBranches.forEach(branch => {
        const isActive = !branch.name.startsWith('Custom ');
        customContainer.innerHTML += `
            <div class="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 transition cursor-pointer"
                 onclick='editBranch(${JSON.stringify(branch)})'>
                <div class="flex items-center gap-3">
                    ${isActive ? `
                        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    ` : `
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    `}
                    <div>
                        <span class="font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}">${branch.name}</span>
                        ${!isActive ? '<p class="text-xs text-gray-400 mt-0.5">Klik om te hernoemen en te activeren</p>' : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${isActive ? `
                        <span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Actief</span>
                    ` : `
                        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Niet actief</span>
                    `}
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            </div>
        `;
    });
}

// Edit branch
window.editBranch = function (branch) {
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('branch-id').value = branch.id;
    document.getElementById('old-name').value = branch.name;
    document.getElementById('new-name').value = branch.name.startsWith('Custom ') ? '' : branch.name;
    document.getElementById('new-name').focus();
};

// Close modal
function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-form').reset();
}

// Form submit
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('branch-id').value;
    const newName = document.getElementById('new-name').value.trim();

    if (!newName) {
        alert('Vul een naam in');
        return;
    }

    // Check if name already exists
    const { data: existing } = await supabaseClient
        .from('Branches')
        .select('id')
        .eq('name', newName)
        .neq('id', id);

    if (existing && existing.length > 0) {
        alert('Deze branch naam bestaat al. Kies een andere naam.');
        return;
    }

    // Update branch
    const { error } = await supabaseClient
        .from('Branches')
        .update({ name: newName })
        .eq('id', id);

    if (error) {
        alert('Fout bij opslaan: ' + error.message);
    } else {
        closeModal();
        loadBranches();
        alert('Branch succesvol hernoemd! De nieuwe naam is nu beschikbaar in de branche dropdown.');
    }
});

// Logout
function logout() {
    localStorage.removeItem('stageconnect_admin_session');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_name');
    window.location.href = 'admin-login.html';
}

// Initialize
loadBranches();
