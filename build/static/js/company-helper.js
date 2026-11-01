/**
 * StageConnectie Shared Helper Functions for Multi-Company Student Assignments
 * Ondersteunt zowel gelijktijdige stages (verschillende dagen in de week)
 * als opeenvolgende stageperiodes (met start_date en end_date per bedrijf).
 */

// Controleert of een specifieke stagekoppeling actief is op een gegeven datum (YYYY-MM-DD)
function isAssignmentActiveOnDate(assignment, dateStr, student = null) {
    if (!dateStr) return true;
    const cleanDate = String(dateStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return true;

    const startDate = assignment?.start_date || null;
    const endDate = assignment?.end_date || null;

    if (startDate && cleanDate < String(startDate).slice(0, 10)) {
        return false;
    }
    if (endDate && cleanDate > String(endDate).slice(0, 10)) {
        return false;
    }
    return true;
}

// Normalizes and extracts company assignments for a student
function getStudentCompanyAssignments(student, companiesList = []) {
    if (!student) return [];

    let rawAssignments = student.company_assignments;
    if (typeof rawAssignments === 'string') {
        try {
            rawAssignments = JSON.parse(rawAssignments);
        } catch (e) {
            rawAssignments = null;
        }
    }

    let assignments = [];

    // 1. Check if structured JSON array company_assignments exists
    if (rawAssignments && Array.isArray(rawAssignments) && rawAssignments.length > 0) {
        assignments = rawAssignments.map((a, idx) => {
            const companyId = a.company_id || a.companyId;
            const company = (companiesList && companiesList.length > 0) 
                ? companiesList.find(c => c.id === companyId) 
                : null;
            return {
                company_id: companyId,
                company_name: company ? company.company_name : (a.company_name || 'Stagebedrijf'),
                company: company || null,
                days: Array.isArray(a.days) ? a.days : [],
                start_date: a.start_date || (idx === 0 && rawAssignments.length === 1 ? (student.stage_start_date || null) : null),
                end_date: a.end_date || (idx === 0 && rawAssignments.length === 1 ? (student.stage_end_date || null) : null)
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
                days: scheduledDays, // fallback: default to student's overall scheduled days
                start_date: null,
                end_date: null
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
            days: Array.isArray(student.scheduled_days) ? student.scheduled_days : [],
            start_date: student.stage_start_date || null,
            end_date: student.stage_end_date || null
        }];
    }

    return assignments;
}

// Checks if a student is assigned to a specific company ID
function isStudentAssignedToCompany(student, companyId) {
    if (!student || !companyId) return false;

    const assignments = getStudentCompanyAssignments(student);
    if (assignments.length > 0) {
        return assignments.some(a => String(a.company_id) === String(companyId));
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
// Optioneel met dateStr (YYYY-MM-DD) zodat opeenvolgende stageperiodes per datum worden gecontroleerd.
function isStudentScheduledForCompany(student, companyId, dayCode, dateStr = null) {
    if (!student) return false;

    const assignments = getStudentCompanyAssignments(student);
    if (assignments.length > 0) {
        const matchingAssignments = assignments.filter(a => String(a.company_id) === String(companyId));
        if (matchingAssignments.length > 0) {
            return matchingAssignments.some(assignment => {
                if (dateStr && !isAssignmentActiveOnDate(assignment, dateStr, student)) {
                    return false;
                }
                const days = assignment.days || [];
                return days.length === 0 || days.includes(dayCode);
            });
        }
    }

    // Fallback: check global stage_start_date / stage_end_date indien aanwezig
    if (dateStr) {
        const cleanDate = String(dateStr).slice(0, 10);
        if (student.stage_start_date && cleanDate < String(student.stage_start_date).slice(0, 10)) return false;
        if (student.stage_end_date && cleanDate > String(student.stage_end_date).slice(0, 10)) return false;
    }

    // Fallback: check global scheduled_days
    const days = Array.isArray(student.scheduled_days) ? student.scheduled_days : [];
    return days.length === 0 || days.includes(dayCode);
}

// Gets the company assignment for a student on a specific day (en optioneel op een specifieke datum YYYY-MM-DD)
function getStudentCompanyForDay(student, dayCode, companiesList = [], dateStr = null) {
    const assignments = getStudentCompanyAssignments(student, companiesList);
    if (assignments.length === 0) return null;

    const activeAssignments = dateStr
        ? assignments.filter(a => isAssignmentActiveOnDate(a, dateStr, student))
        : assignments;

    const pool = activeAssignments.length > 0 ? activeAssignments : (dateStr ? [] : assignments);
    if (pool.length === 0) return null;

    // Find assignment that has dayCode in its days array
    const dayAssignment = pool.find(a => a.days && a.days.includes(dayCode));
    return dayAssignment || pool[0];
}

// Gets ALL company assignments for a student on a specific day (en optioneel op een specifieke datum YYYY-MM-DD)
function getStudentCompaniesForDay(student, dayCode, companiesList = [], dateStr = null) {
    const assignments = getStudentCompanyAssignments(student, companiesList);
    if (assignments.length === 0) return [];

    const activeAssignments = dateStr
        ? assignments.filter(a => isAssignmentActiveOnDate(a, dateStr, student))
        : assignments;

    const pool = activeAssignments.length > 0 ? activeAssignments : (dateStr ? [] : assignments);
    if (pool.length === 0) return [];

    const dayAssignments = pool.filter(a => a.days && a.days.includes(dayCode));
    return dayAssignments.length > 0 ? dayAssignments : pool;
}

// Expose globally for browser
if (typeof window !== 'undefined') {
    window.isAssignmentActiveOnDate = isAssignmentActiveOnDate;
    window.getStudentCompanyAssignments = getStudentCompanyAssignments;
    window.isStudentAssignedToCompany = isStudentAssignedToCompany;
    window.isStudentScheduledForCompany = isStudentScheduledForCompany;
    window.getStudentCompanyForDay = getStudentCompanyForDay;
    window.getStudentCompaniesForDay = getStudentCompaniesForDay;
}

// Expose for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAssignmentActiveOnDate,
        getStudentCompanyAssignments,
        isStudentAssignedToCompany,
        isStudentScheduledForCompany,
        getStudentCompanyForDay,
        getStudentCompaniesForDay
    };
}
