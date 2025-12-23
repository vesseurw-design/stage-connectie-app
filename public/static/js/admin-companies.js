/**
 * Admin Companies Management
 * Met branche functionaliteit
 */

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allBranches = [];
let currentFilter = '';

// Load branches
async function loadBranches() {
    const { data, error } = await supabaseClient
        .from('Branches')
        .select('*')
        .order('is_custom', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error loading branches:', error);
        return;
    }

    allBranches = data || [];

    // Populate branche dropdown in modal
    const brancheSelect = document.getElementById('branche');
    brancheSelect.innerHTML = '<option value="">Selecteer branche...</option>';

    allBranches.forEach(branch => {
        // Skip custom branches that haven't been renamed yet
        if (branch.is_custom && branch.name.startsWith('Custom ')) {
            return;
        }
        brancheSelect.innerHTML += `<option value="${branch.name}">${branch.name}</option>`;
    });

    // Populate filter dropdown
    const filterSelect = document.getElementById('branche-filter');
    filterSelect.innerHTML = '<option value="">Alle Branches</option>';

    allBranches.forEach(branch => {
        if (branch.is_custom && branch.name.startsWith('Custom ')) {
            return;
        }
        filterSelect.innerHTML += `<option value="${branch.name}">${branch.name}</option>`;
    });
}

// Load companies
async function loadData() {
    let query = supabaseClient
        .from('Bedrijven')
        .select('*')
        .order('company_name');

    // Apply filter if selected
    if (currentFilter) {
        query = query.eq('branche', currentFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error loading companies:', error);
        return;
    }

    const tbody = document.getElementById('companies-table-body');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    ${currentFilter ? 'Geen bedrijven gevonden in deze branche' : 'Nog geen bedrijven toegevoegd'}
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(company => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">${company.company_name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${company.branche ? `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${company.branche}</span>` : '-'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${company.contact_person || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${company.email || '-'}</td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                    <button onclick='editCompany(${JSON.stringify(company)})' class="text-blue-600 hover:text-blue-900 mr-3">
                        Bewerk
                    </button>
                    <button onclick="deleteCompany('${company.id}')" class="text-red-600 hover:text-red-900">
                        Verwijder
                    </button>
                </td>
            </tr>
        `;
    });
}

// Open modal
function openModal(company = null) {
    const modal = document.getElementById('company-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('company-form');

    modal.classList.remove('hidden');

    if (company) {
        title.textContent = 'Bedrijf Bewerken';
        document.getElementById('company-id').value = company.id;
        document.getElementById('company_name').value = company.company_name;
        document.getElementById('branche').value = company.branche || '';
        document.getElementById('contact_person').value = company.contact_person || '';
        document.getElementById('email').value = company.email || '';
        document.getElementById('phone_number').value = company.phone_number || '';
    } else {
        title.textContent = 'Bedrijf Toevoegen';
        form.reset();
        document.getElementById('company-id').value = '';
    }
}

// Close modal
function closeModal() {
    document.getElementById('company-modal').classList.add('hidden');
}

// Edit company
window.editCompany = function (company) {
    openModal(company);
};

// Delete company
window.deleteCompany = async function (id) {
    if (!confirm('Weet je zeker dat je dit bedrijf wilt verwijderen?\n\nLet op: gekoppelde studenten verliezen hun koppeling.')) {
        return;
    }

    const { error } = await supabaseClient
        .from('Bedrijven')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Fout bij verwijderen: ' + error.message);
    } else {
        loadData();
    }
};

// Form submit
document.getElementById('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('company-id').value;
    const companyData = {
        company_name: document.getElementById('company_name').value,
        branche: document.getElementById('branche').value || null,
        contact_person: document.getElementById('contact_person').value || null,
        email: document.getElementById('email').value || null,
        phone_number: document.getElementById('phone_number').value || null
    };

    let error;
    if (id) {
        // Update
        const result = await supabaseClient
            .from('Bedrijven')
            .update(companyData)
            .eq('id', id);
        error = result.error;
    } else {
        // Insert
        const result = await supabaseClient
            .from('Bedrijven')
            .insert([companyData]);
        error = result.error;
    }

    if (error) {
        alert('Fout bij opslaan: ' + error.message);
    } else {
        closeModal();
        loadData();
    }
});

// Filter change
document.getElementById('branche-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    loadData();
});

// Logout
function logout() {
    localStorage.removeItem('stageconnect_admin_session');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_name');
    window.location.href = 'admin-login.html';
}

// Initialize
async function init() {
    await loadBranches();
    await loadData();
}

init();
