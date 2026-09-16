/**
 * StageConnectie Shared Helper Functions for Multi-Company Student Assignments
 */

// Normalizes and extracts company assignments for a student
function getStudentCompanyAssignments(student, companiesList = []) {
    if (!student) return [];

    let assignments = [];

    // 1. Check if structured JSON array company_assignments exists
    if (student.company_assignments && Array.isArray(student.company_assignments) && student.company_assignments.length > 0) {
        assignments = student.company_assignments.map(a => {
            const companyId = a.company_id || a.companyId;
            const company = (companiesList && companiesList.length > 0) 
                ? companiesList.find(c => c.id === companyId) 
                : null;
            return {
                company_id: companyId,
                company_name: company ? company.company_name : (a.company_name || 'Stagebedrijf'),
                company: company || null,
                days: Array.isArray(a.days) ? a.days : []
            };
        });
    } 
    // 2. Legacy fallback: check if company_id is comma-separated string
    else if (student.company_id && typeof student.company_id === 'string' && student.company_id.includes(',')) {
        const ids = student.company_id.split(',').map(id => id.trim()).filter(Boolean);
        const scheduledDays = Array.isArray(student.scheduled_days) ? student.scheduled_days : [];
        assignments = ids.map(id => {
            const company = (companiesList && companiesList.length > 0) 
                ? companiesList.find(c => c.id === id) 
                : null;
            return {
                company_id: id,
                company_name: company ? company.company_name : 'Stagebedrijf',
                company: company || null,
                days: scheduledDays // fallback: default to student's overall scheduled days
            };
        });
    }
    // 3. Legacy fallback: single company_id
    else if (student.company_id) {
        const company = (companiesList && companiesList.length > 0) 
            ? companiesList.find(c => c.id === student.company_id) 
            : null;
        assignments = [{
            company_id: student.company_id,
            company_name: company ? company.company_name : 'Stagebedrijf',
            company: company || null,
            days: Array.isArray(student.scheduled_days) ? student.scheduled_days : []
        }];
    }

    return assignments;
}

// Checks if a student is assigned to a specific company ID
function isStudentAssignedToCompany(student, companyId) {
    if (!student || !companyId) return false;

    if (student.company_assignments && Array.isArray(student.company_assignments) && student.company_assignments.length > 0) {
        return student.company_assignments.some(a => (a.company_id || a.companyId) === companyId);
    }

    if (student.company_id) {
        if (typeof student.company_id === 'string') {
            return student.company_id.includes(companyId);
        }
        return student.company_id === companyId;
    }

    return false;
}

// Checks if a student is scheduled for a given company on a specific day (e.g., 'Ma', 'Di', 'Wo', 'Do', 'Vr')
function isStudentScheduledForCompany(student, companyId, dayCode) {
    if (!student) return false;

    // Check specific company assignment
    if (student.company_assignments && Array.isArray(student.company_assignments) && student.company_assignments.length > 0) {
        const assignment = student.company_assignments.find(a => (a.company_id || a.companyId) === companyId);
        if (assignment) {
            const days = assignment.days || [];
            return days.length === 0 || days.includes(dayCode);
        }
    }

    // Fallback: check global scheduled_days
    const days = Array.isArray(student.scheduled_days) ? student.scheduled_days : [];
    return days.length === 0 || days.includes(dayCode);
}

// Gets the company assignment for a student on a specific day
function getStudentCompanyForDay(student, dayCode, companiesList = []) {
    const assignments = getStudentCompanyAssignments(student, companiesList);
    if (assignments.length === 0) return null;

    // Find assignment that has dayCode in its days array
    const dayAssignment = assignments.find(a => a.days && a.days.includes(dayCode));
    return dayAssignment || assignments[0];
}

// Expose globally for browser
if (typeof window !== 'undefined') {
    window.getStudentCompanyAssignments = getStudentCompanyAssignments;
    window.isStudentAssignedToCompany = isStudentAssignedToCompany;
    window.isStudentScheduledForCompany = isStudentScheduledForCompany;
    window.getStudentCompanyForDay = getStudentCompanyForDay;
}

// Expose for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStudentCompanyAssignments,
        isStudentAssignedToCompany,
        isStudentScheduledForCompany,
        getStudentCompanyForDay
    };
}
