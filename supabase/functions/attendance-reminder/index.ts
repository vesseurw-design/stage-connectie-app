import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to wait
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('🚀 Start attendance-reminder check...');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: { autoRefreshToken: false, persistSession: false }
            }
        )

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

        // 1. Get dates using pure UTC to avoid timezone offset shifts
        const now = new Date();
        const utcYear = now.getUTCFullYear();
        const utcMonth = now.getUTCMonth();
        const utcDate = now.getUTCDate();
        const utcDay = now.getUTCDay(); // 0 = Sun, 1 = Mon...

        const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
        const monday = new Date(Date.UTC(utcYear, utcMonth, utcDate + diffToMonday));

        const weekDates: { [key: string]: string } = {};
        const dayMap = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setUTCDate(monday.getUTCDate() + i);
            weekDates[dayMap[i]] = d.toISOString().split('T')[0];
        }

        // 2. Fetch data
        const { data: students } = await supabaseAdmin.from('Students').select('*');
        const { data: companies } = await supabaseAdmin.from('Bedrijven').select('*');
        const { data: attendance } = await supabaseAdmin.from('Attendance').select('*').gte('date', weekDates['Ma']).lte('date', weekDates['Vr']);
        const { data: holidays } = await supabaseAdmin.from('Vakanties').select('*').lte('start_date', weekDates['Vr']).gte('end_date', weekDates['Ma']);

        // 2b. Check if TODAY is a holiday. If so, skip everything.
        const todayStr = now.toISOString().split('T')[0];
        const isTodayHoliday = holidays?.some(h => todayStr >= h.start_date && todayStr <= h.end_date);
        
        if (isTodayHoliday) {
            console.log('🏖️ Today is a holiday. Skipping attendance reminders.');
            return new Response(JSON.stringify({ success: true, message: 'Holiday today, no reminders sent.' }), { status: 200 });
        }

        const reminderList: { [email: string]: any } = {};

        // 3. Logic
        for (const student of students || []) {
            // Skip unenrolled or ended internship students
            const isUnenrolled = (student.unenrollment_date && new Date(student.unenrollment_date) <= now) ||
                                 (student.enrollment_end_date && new Date(student.enrollment_end_date) <= now) ||
                                 (student.end_date && new Date(student.end_date) <= now);
            if (isUnenrolled) {
                console.log(`Skipping unenrolled/inactive student: ${student.name}`);
                continue;
            }

            // Determine company assignments (supports multi-company JSON and single company_id)
            const assignments: Array<{ company_id: string; days: string[] }> = [];

            if (student.company_assignments) {
                let ca = student.company_assignments;
                if (typeof ca === 'string') {
                    try { ca = JSON.parse(ca); } catch (e) { ca = []; }
                }
                if (Array.isArray(ca) && ca.length > 0) {
                    for (const a of ca) {
                        const cid = a.company_id || a.companyId;
                        if (cid) {
                            assignments.push({
                                company_id: cid,
                                days: Array.isArray(a.days) && a.days.length > 0 ? a.days : (student.scheduled_days || [])
                            });
                        }
                    }
                }
            }

            if (assignments.length === 0 && student.company_id) {
                const ids = typeof student.company_id === 'string'
                    ? student.company_id.split(',').map((id: string) => id.trim()).filter(Boolean)
                    : [student.company_id];
                for (const cid of ids) {
                    assignments.push({
                        company_id: cid,
                        days: student.scheduled_days || []
                    });
                }
            }

            if (assignments.length === 0) continue;

            for (const assignment of assignments) {
                const company = companies?.find(c => c.id === assignment.company_id);
                if (!company || !company.email) continue;

                const scheduled = assignment.days || [];
                const missingDays: string[] = [];

                for (const dayCode of scheduled) {
                    const dateStr = weekDates[dayCode];
                    if (!dateStr || dateStr > todayStr) continue;

                    // Check if this date falls within a holiday
                    const isHoliday = holidays?.some(h => dateStr >= h.start_date && dateStr <= h.end_date);
                    if (isHoliday) continue;

                    // Check if attendance record exists with a valid status or student_status
                    const hasRecord = attendance?.some(a =>
                        a.student_id === student.id &&
                        a.date === dateStr &&
                        (a.status || a.student_status)
                    );

                    if (!hasRecord) {
                        missingDays.push(dayCode);
                    }
                }

                if (missingDays.length > 0) {
                    if (!reminderList[company.email]) {
                        reminderList[company.email] = { name: company.company_name, students: [] };
                    }
                    reminderList[company.email].students.push({ name: student.name, days: missingDays });
                }
            }
        }

        // 4. Send with Delay (to avoid 429 rate limit)
        const results = [];
        const emails = Object.entries(reminderList);
        console.log(`✉️ Preparing to send ${emails.length} emails with rate-limiting...`);

        for (const [email, info] of emails) {
            const studentDetails = info.students.map((s: any) => `${s.name} (${s.days.join(', ')})`).join('\n');

            console.log(`📧 Sending email to ${email} via no-reply@stageconnectie.nl`);

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                    from: 'StageConnectie <no-reply@stageconnectie.nl>',
                    to: email,
                    subject: 'Herinnering: Aanwezigheidsregistratie invullen',
                    html: `
                        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #1e293b;">Beste ${info.name},</h2>
                            <p>Dit is een herinnering dat de aanwezigheid voor deze week nog niet volledig is ingevoerd voor de volgende student(en):</p>
                            <ul style="background: #f8fafc; padding: 15px; border-radius: 6px; list-style: none;">
                                ${info.students.map((s: any) => `<li style="margin-bottom: 8px;"><strong>${s.name}</strong>: ${s.days.join(', ')}</li>`).join('')}
                            </ul>
                            <p>Zou je dit alsnog willen invullen? Dit helpt ons bij het begeleiden van de studenten.</p>
                            <a href="https://stageconnectie.nl" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Naar het Portaal</a>
                            <p style="margin-top: 25px; font-size: 14px; color: #64748b;">Met vriendelijke groet,<br>Het stage team van Groene Hart Praktijkschool</p>
                        </div>
                    `
                })
            });

            const resData = await response.json();
            console.log(`📬 Response:`, resData);
            results.push({ email, success: response.ok, resData });

            // Wait 500ms before next send to stay under Resend's 2/sec limit
            await delay(500);
        }

        return new Response(JSON.stringify({ success: true, processed: results }), { status: 200 });

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
})
