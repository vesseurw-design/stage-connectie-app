import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

async function signEmployerToken(payload: { cid: string; email: string; exp?: number }, secret: string): Promise<string> {
    const dataObj = {
        cid: payload.cid,
        email: payload.email.trim().toLowerCase(),
        exp: payload.exp || (Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 dagen geldig
    }
    const encoder = new TextEncoder()
    const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(dataObj)))
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
    const sigB64 = toBase64Url(new Uint8Array(sigBuffer))
    return `${payloadB64}.${sigB64}`
}

async function verifyEmployerToken(token: string, secret: string): Promise<{ cid: string; email: string; exp: number } | null> {
    try {
        if (!token || !token.includes('.')) return null
        const [payloadB64, sigB64] = token.split('.')
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        )
        const sigBytes = fromBase64Url(sigB64)
        const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64))
        if (!isValid) return null

        const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64))
        const parsed = JSON.parse(payloadJson)
        if (!parsed.exp || Date.now() > parsed.exp) return null
        return parsed
    } catch (_e) {
        return null
    }
}

function isStudentAssignedToCompanyHelper(student: any, companyId: string): boolean {
    if (!student || !companyId) return false
    if (student.company_assignments) {
        try {
            const arr = typeof student.company_assignments === 'string'
                ? JSON.parse(student.company_assignments)
                : student.company_assignments
            if (Array.isArray(arr) && arr.length > 0) {
                if (arr.some((a: any) => (a.company_id || a.companyId) === companyId)) return true
            }
        } catch (_e) {}
    }
    if (student.company_id) {
        return String(student.company_id).includes(companyId)
    }
    return false
}

function isStudentScheduledForCompanyHelper(student: any, companyId: string, dayCode: string): boolean {
    if (!student) return false
    if (student.company_assignments) {
        try {
            const arr = typeof student.company_assignments === 'string'
                ? JSON.parse(student.company_assignments)
                : student.company_assignments
            if (Array.isArray(arr) && arr.length > 0) {
                const assignment = arr.find((a: any) => (a.company_id || a.companyId) === companyId)
                if (assignment) {
                    const days = Array.isArray(assignment.days) ? assignment.days : []
                    return days.length === 0 || days.includes(dayCode)
                }
            }
        } catch (_e) {}
    }
    const days = Array.isArray(student.scheduled_days) ? student.scheduled_days : []
    return days.length === 0 || days.includes(dayCode)
}

function getMondayDateStr(dateInput?: string): string {
    const d = dateInput ? new Date(dateInput + 'T12:00:00Z') : new Date()
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    d.setUTCDate(diff)
    return d.toISOString().split('T')[0]
}

function getWeekDatesFromMonday(mondayStr: string): string[] {
    const base = new Date(mondayStr + 'T12:00:00Z')
    return [0, 1, 2, 3, 4].map(offset => {
        const dt = new Date(base)
        dt.setUTCDate(base.getUTCDate() + offset)
        return dt.toISOString().split('T')[0]
    })
}

async function ensureEmployerAuthAndMagicHash(supabaseAdmin: any, email: string, company: any): Promise<string> {
    const cleanEmail = email.trim().toLowerCase()
    const meta = {
        role: 'employer',
        company_id: company.id,
        company_name: company.company_name
    }

    // Probeer direct een magiclink te genereren
    let linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { data: meta }
    })

    if (linkRes.error) {
        // Maak eerst het auth account aan als deze nog niet bestond
        await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            user_metadata: meta,
            app_metadata: meta
        })
        linkRes = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: cleanEmail,
            options: { data: meta }
        })
    } else if (linkRes.data?.user) {
        const u = linkRes.data.user
        if (u.user_metadata?.role !== 'employer' || u.user_metadata?.company_id !== company.id) {
            await supabaseAdmin.auth.admin.updateUserById(u.id, {
                email_confirm: true,
                user_metadata: { ...(u.user_metadata || {}), ...meta },
                app_metadata: { ...(u.app_metadata || {}), ...meta }
            })
        }
    }

    return linkRes.data?.properties?.hashed_token || ''
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { action, email, password, role, metadata, sendEmail, name, loginUrl, recipients, subject } = body

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Create Supabase client with Admin rights
        const supabaseAdmin = createClient(
            SUPABASE_URL,
            SERVICE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Default portal URL op basis van Supabase project (GHPC vs De Poort)
        const defaultPortalBase = SUPABASE_URL.includes('vvfvakpnotvehjcndrxh')
            ? 'https://depoort.stageconnectie.nl/employer-portal.html'
            : 'https://ghpc.stageconnectie.nl/employer-portal.html'
        const defaultSchoolName = SUPABASE_URL.includes('vvfvakpnotvehjcndrxh')
            ? 'De Poort praktijkonderwijs'
            : 'Groene Hart Pro College'

        // ============================================================================
        // ACTIE 1: Wachtwoordloos inloggen vanaf login.html (Magic Link voor bedrijven)
        // ============================================================================
        if (action === 'request-employer-magic-link') {
            if (!email) throw new Error('Vul een geldig e-mailadres in.')
            const cleanEmail = email.trim().toLowerCase()

            const { data: companies } = await supabaseAdmin
                .from('Bedrijven')
                .select('*')
                .ilike('email', cleanEmail)

            const company = companies?.[0]
            if (!company) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Dit e-mailadres is niet gevonden als geregistreerd stagebedrijf. Controleer het e-mailadres of neem contact op met de stagecoördinator.'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // Zorg dat auth user klaarstaat
            await ensureEmployerAuthAndMagicHash(supabaseAdmin, cleanEmail, company)

            const etoken = await signEmployerToken({ cid: company.id, email: cleanEmail }, SERVICE_KEY)
            const portalUrl = (body.portalUrl || defaultPortalBase).split('?')[0]
            const directLoginLink = `${portalUrl}?etoken=${encodeURIComponent(etoken)}`
            const schoolTitle = body.schoolName || defaultSchoolName

            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
            if (!RESEND_API_KEY) throw new Error('E-mailservice (RESEND_API_KEY) is niet geconfigureerd.')

            const recipientName = company.contact_person || company.company_name || 'stagebegeleider / werkgever'
            const htmlContent = `
                <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #1e293b; margin: 0;">StageConnectie</h2>
                        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${schoolTitle}</p>
                    </div>
                    <h3 style="color: #1e293b; margin-top: 0;">Beste ${recipientName},</h3>
                    <p style="color: #334155; line-height: 1.6;">
                        Klik op de onderstaande knop om direct (zonder wachtwoord) in te loggen op het Stagebedrijf Portaal voor <strong>${company.company_name}</strong>:
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${directLoginLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                            🚀 Direct Inloggen (Geen wachtwoord nodig)
                        </a>
                    </div>
                    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
                            ✅ <strong>Handig:</strong> Na 1 klik bent u direct ingelogd en onthoudt uw telefoon of computer uw sessie automatisch. U hoeft geen wachtwoord meer te onthouden.
                        </p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
                        Met vriendelijke groet,<br>
                        <strong>het stageteam van ${schoolTitle}</strong>
                    </p>
                </div>
            `

            const mailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'StageConnectie <no-reply@stageconnectie.nl>',
                    to: cleanEmail,
                    subject: `Direct inloggen op StageConnectie - ${company.company_name}`,
                    html: htmlContent
                })
            })

            if (!mailRes.ok) {
                const errText = await mailRes.text()
                throw new Error('Kon e-mail niet verzenden: ' + errText)
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Directe inloglink is verzonden naar ' + cleanEmail
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================================================================
        // ACTIE 2: Verifieer etoken vanuit e-mail + optioneel 1-klik week goedkeuren
        // ============================================================================
        if (action === 'verify-employer-token') {
            const { etoken, autoApproveWeek } = body
            const verified = await verifyEmployerToken(etoken, SERVICE_KEY)
            if (!verified) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Deze inloglink is verlopen of ongeldig. Vraag op de inlogpagina met 1 klik een nieuwe link aan.'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            let company = null
            if (verified.cid) {
                const { data } = await supabaseAdmin.from('Bedrijven').select('*').eq('id', verified.cid).maybeSingle()
                company = data
            }
            if (!company && verified.email) {
                const { data } = await supabaseAdmin.from('Bedrijven').select('*').ilike('email', verified.email).maybeSingle()
                company = data
            }
            if (!company) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Stagebedrijf niet gevonden.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            const cleanEmail = (company.email || verified.email).trim().toLowerCase()
            const tokenHash = await ensureEmployerAuthAndMagicHash(supabaseAdmin, cleanEmail, company)

            let approvedCount = 0
            const approvedDetails: string[] = []
            let targetMonday = ''

            if (autoApproveWeek) {
                targetMonday = autoApproveWeek === 'current' ? getMondayDateStr() : getMondayDateStr(autoApproveWeek)
                const weekDates = getWeekDatesFromMonday(targetMonday)
                const dayCodes = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

                const { data: allStudents } = await supabaseAdmin.from('Students').select('*')
                const now = new Date()
                const companyStudents = (allStudents || []).filter((s: any) => {
                    const isUnenrolled =
                        (s.unenrollment_date && new Date(s.unenrollment_date) <= now) ||
                        (s.enrollment_end_date && new Date(s.enrollment_end_date) <= now) ||
                        (s.stage_end_date && new Date(s.stage_end_date) <= now) ||
                        (s.end_date && new Date(s.end_date) <= now)
                    if (isUnenrolled) return false
                    return isStudentAssignedToCompanyHelper(s, company.id)
                })

                if (companyStudents.length > 0) {
                    const studentIds = companyStudents.map((s: any) => s.id)
                    const { data: existingAtt } = await supabaseAdmin
                        .from('Attendance')
                        .select('*')
                        .in('student_id', studentIds)
                        .in('date', weekDates)

                    const attMap = new Map<string, any>()
                    ;(existingAtt || []).forEach((r: any) => {
                        attMap.set(`${r.student_id}_${r.date}`, r)
                    })

                    const upserts: any[] = []
                    for (const student of companyStudents) {
                        for (let i = 0; i < 5; i++) {
                            const dateStr = weekDates[i]
                            const dayCode = dayCodes[i]
                            if (!isStudentScheduledForCompanyHelper(student, company.id, dayCode)) continue

                            const existing = attMap.get(`${student.id}_${dateStr}`)
                            const existingEmployerStatus = existing?.status && existing.status !== 'pending' && existing.status !== 'null' && existing.status !== 'undefined'
                                ? existing.status
                                : ''

                            // Alleen goedkeuren als het bedrijf deze dag nog niet zelf had ingevuld
                            if (!existingEmployerStatus) {
                                const studentSt = existing?.student_status && existing.student_status !== 'pending' && existing.student_status !== 'null' && existing.student_status !== 'undefined'
                                    ? existing.student_status
                                    : ''
                                const finalStatus = ['present', 'absent', 'sick', 'late'].includes(studentSt) ? studentSt : 'present'
                                const rawHours = parseFloat(existing?.student_hours)
                                const finalHours = (finalStatus === 'present' || finalStatus === 'late')
                                    ? (rawHours > 0 ? rawHours : 8)
                                    : 0

                                upserts.push({
                                    student_id: student.id,
                                    date: dateStr,
                                    employer_id: company.id,
                                    status: finalStatus,
                                    minutes_late: existing?.minutes_late || 0,
                                    student_hours: finalHours,
                                    notes: existing?.notes || null
                                })
                                approvedDetails.push(`${student.name} (${dayCode})`)
                            }
                        }
                    }

                    if (upserts.length > 0) {
                        const { error: upsertErr } = await supabaseAdmin
                            .from('Attendance')
                            .upsert(upserts, { onConflict: 'student_id,date' })
                        if (!upsertErr) {
                            approvedCount = upserts.length
                        }
                    }
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    company: {
                        id: company.id,
                        company_name: company.company_name,
                        email: cleanEmail
                    },
                    email: cleanEmail,
                    token_hash: tokenHash,
                    autoApproved: Boolean(autoApproveWeek),
                    approvedCount,
                    approvedDetails,
                    weekMonday: targetMonday
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================================================================
        // ACTIE 3: Vrijdagmiddag Herinneringsmail (ALLEEN naar bedrijven die deze week nog niets hebben ingevuld)
        // ============================================================================
        if (action === 'send-weekly-unfilled-reminders') {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
            const dryRun = Boolean(body.dryRun)
            if (!dryRun && !RESEND_API_KEY) {
                throw new Error('RESEND_API_KEY is niet ingesteld')
            }

            const mondayStr = getMondayDateStr(body.weekMonday)
            const weekDates = getWeekDatesFromMonday(mondayStr)
            const dayCodes = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
            const dayLabelsFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

            const { data: allStudents } = await supabaseAdmin.from('Students').select('*')
            const { data: allCompanies } = await supabaseAdmin.from('Bedrijven').select('*')
            const { data: weekAttendance } = await supabaseAdmin
                .from('Attendance')
                .select('*')
                .in('date', weekDates)

            const now = new Date()
            const activeStudents = (allStudents || []).filter((s: any) => {
                const emailLower = (s.email || '').toLowerCase()
                if (emailLower === 'fake@leerling.nl' || (s.name || '').toLowerCase().includes('test leerling')) return false
                const isUnenrolled =
                    (s.unenrollment_date && new Date(s.unenrollment_date) <= now) ||
                    (s.enrollment_end_date && new Date(s.enrollment_end_date) <= now) ||
                    (s.stage_end_date && new Date(s.stage_end_date) <= now) ||
                    (s.end_date && new Date(s.end_date) <= now)
                return !isUnenrolled
            })

            const attMap = new Map<string, any>()
            ;(weekAttendance || []).forEach((r: any) => {
                attMap.set(`${r.student_id}_${r.date}`, r)
            })

            const portalUrl = (body.portalUrl || defaultPortalBase).split('?')[0]
            const schoolTitle = body.schoolName || defaultSchoolName

            const statusLabelsNl: Record<string, string> = {
                present: '✅ Aanwezig',
                absent: '❌ Afwezig',
                sick: '🤒 Ziek',
                late: '⏱️ Te laat'
            }

            const targetCompanies: any[] = []
            const skippedAlreadyFilled: any[] = []

            for (const comp of (allCompanies || [])) {
                if (!comp.email) continue
                const cleanEmail = comp.email.trim().toLowerCase()
                if (cleanEmail === 'test@testbedrijf.nl' || cleanEmail === 'test@test.nl') continue
                if (body.companyId && comp.id !== body.companyId) continue

                const compStudents = activeStudents.filter((s: any) => isStudentAssignedToCompanyHelper(s, comp.id))
                if (compStudents.length === 0) continue

                let employerFilledCount = 0
                let scheduledCount = 0
                const studentSummaries: { studentName: string; studentClass: string; daysHtml: string[] }[] = []

                for (const student of compStudents) {
                    const daysHtml: string[] = []
                    for (let i = 0; i < 5; i++) {
                        const dayCode = dayCodes[i]
                        const dateStr = weekDates[i]
                        if (!isStudentScheduledForCompanyHelper(student, comp.id, dayCode)) continue

                        scheduledCount++
                        const rec = attMap.get(`${student.id}_${dateStr}`)
                        const empStatus = rec?.status && rec.status !== 'pending' && rec.status !== 'null' && rec.status !== 'undefined'
                            ? rec.status
                            : ''
                        const stuStatus = rec?.student_status && rec.student_status !== 'pending' && rec.student_status !== 'null' && rec.student_status !== 'undefined'
                            ? rec.student_status
                            : ''
                        const stuHours = parseFloat(rec?.student_hours) || 0

                        const dtFormatted = new Date(dateStr + 'T12:00:00Z').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })

                        if (empStatus) {
                            employerFilledCount++
                        } else if (stuStatus) {
                            const label = statusLabelsNl[stuStatus] || stuStatus
                            const hoursTxt = stuHours > 0 ? ` (${stuHours} uur)` : ''
                            daysHtml.push(`<li><strong>${dayLabelsFull[i]} ${dtFormatted}:</strong> ${label}${hoursTxt} <span style="color:#d97706;font-size:12px;">(ingevuld door stagiair)</span></li>`)
                        } else {
                            daysHtml.push(`<li><strong>${dayLabelsFull[i]} ${dtFormatted}:</strong> Geplande stagedag <span style="color:#64748b;font-size:12px;">(standaard: Aanwezig, 8 uur)</span></li>`)
                        }
                    }

                    if (daysHtml.length > 0) {
                        studentSummaries.push({
                            studentName: student.name,
                            studentClass: student.class || '',
                            daysHtml
                        })
                    }
                }

                if (scheduledCount === 0) continue

                // ALLEEN versturen naar bedrijven die deze week nog NIETS hebben ingevuld!
                if (employerFilledCount > 0) {
                    skippedAlreadyFilled.push({
                        id: comp.id,
                        company_name: comp.company_name,
                        email: cleanEmail,
                        employerFilledCount,
                        scheduledCount
                    })
                    continue
                }

                targetCompanies.push({
                    company: comp,
                    email: cleanEmail,
                    scheduledCount,
                    studentSummaries
                })
            }

            if (dryRun) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        dryRun: true,
                        weekMonday: mondayStr,
                        toSendCount: targetCompanies.length,
                        alreadyFilledCount: skippedAlreadyFilled.length,
                        companiesToSend: targetCompanies.map(t => ({
                            id: t.company.id,
                            company_name: t.company.company_name,
                            email: t.email,
                            students: t.studentSummaries.map((s: any) => s.studentName)
                        })),
                        alreadyFilledCompanies: skippedAlreadyFilled
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            const sendResults: any[] = []
            for (const item of targetCompanies) {
                const { company, email: cleanEmail, studentSummaries } = item
                const etoken = await signEmployerToken({ cid: company.id, email: cleanEmail }, SERVICE_KEY)
                const approveOneClickLink = `${portalUrl}?etoken=${encodeURIComponent(etoken)}&autoApproveWeek=${mondayStr}`
                const openPortalLink = `${portalUrl}?etoken=${encodeURIComponent(etoken)}`
                const recipientName = company.contact_person || company.company_name || 'stagebegeleider / werkgever'

                const studentsBlocksHtml = studentSummaries.map((st: any) => `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px;">
                        <div style="font-weight: bold; color: #0f172a; font-size: 15px; margin-bottom: 6px;">
                            👤 ${st.studentName} ${st.studentClass ? `<span style="color:#2563eb;font-size:12px;">(${st.studentClass})</span>` : ''}
                        </div>
                        <ul style="margin: 0; padding-left: 18px; color: #334155; font-size: 13.5px; line-height: 1.7;">
                            ${st.daysHtml.join('')}
                        </ul>
                    </div>
                `).join('')

                const htmlContent = `
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
                        <div style="text-align: center; margin-bottom: 18px;">
                            <h2 style="color: #1e293b; margin: 0;">StageConnectie</h2>
                            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${schoolTitle} • Weekoverzicht</p>
                        </div>

                        <h3 style="color: #1e293b; margin-top: 0;">Beste ${recipientName},</h3>
                        <p style="color: #334155; line-height: 1.6;">
                            Voor <strong>${company.company_name}</strong> staat de aanwezigheid van deze week nog open. U kunt deze week hieronder <strong>met 1 klik direct goedkeuren</strong> (zonder wachtwoord):
                        </p>

                        ${studentsBlocksHtml}

                        <div style="text-align: center; margin: 26px 0 16px 0;">
                            <a href="${approveOneClickLink}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 16px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.25);">
                                ✅ Keur deze week met 1 klik goed
                            </a>
                        </div>

                        <div style="text-align: center; margin-bottom: 24px;">
                            <a href="${openPortalLink}" style="display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                ✏️ Was de stagiair ziek, te laat of afwezig? Pas aan in portaal
                            </a>
                        </div>

                        <p style="font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.5;">
                            🔒 <em>Geen wachtwoord nodig: bovenstaande knoppen loggen u veilig en direct in voor <strong>${company.company_name}</strong>.</em>
                        </p>

                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 22px 0;">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
                            Hartelijk dank voor het begeleiden van onze stagiair(s)!<br>
                            <strong>het stageteam van ${schoolTitle}</strong>
                        </p>
                    </div>
                `

                try {
                    const sendRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_API_KEY}`
                        },
                        body: JSON.stringify({
                            from: 'StageConnectie <no-reply@stageconnectie.nl>',
                            to: cleanEmail,
                            subject: `Stage-uren deze week met 1 klik goedkeuren - ${company.company_name}`,
                            html: htmlContent
                        })
                    })
                    const sendData = await sendRes.json()
                    sendResults.push({ company: company.company_name, email: cleanEmail, success: sendRes.ok, data: sendData })
                } catch (err: any) {
                    sendResults.push({ company: company.company_name, email: cleanEmail, success: false, error: err.message })
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    weekMonday: mondayStr,
                    sentCount: sendResults.filter(r => r.success).length,
                    alreadyFilledCount: skippedAlreadyFilled.length,
                    results: sendResults
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        if (action === 'send-broadcast-email') {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is niet ingesteld');

            // Fetch active student company IDs to filter recipients
            const { data: activeStudents } = await supabaseAdmin
                .from('Students')
                .select('company_id, unenrollment_date, enrollment_end_date, end_date')
                .not('company_id', 'is', null);

            const now = new Date();
            const activeCompanyIds = new Set(
                (activeStudents || [])
                    .filter(s => {
                        const isUnenrolled = (s.unenrollment_date && new Date(s.unenrollment_date) <= now) ||
                                             (s.enrollment_end_date && new Date(s.enrollment_end_date) <= now) ||
                                             (s.end_date && new Date(s.end_date) <= now);
                        return !isUnenrolled;
                    })
                    .map(s => s.company_id)
            );

            const results = [];
            for (const r of (recipients || [])) {
                if (!r.email) continue;

                // Skip companies without an active student unless explicitly forced
                if (r.id && !activeCompanyIds.has(r.id) && !body.ignoreActiveFilter) {
                    console.log(`Skipping company without active student: ${r.company_name || r.id} (${r.email})`);
                    results.push({ email: r.email, skipped: true, reason: 'Geen actieve stagiair' });
                    continue;
                }

                const recipientName = r.contact_person || r.company_name || 'stagebegeleider / werkgever';

                const personalizedHtml = `
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #1e293b; margin: 0;">StageConnectie</h2>
                            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Groene Hart Pro College</p>
                        </div>
                        
                        <h3 style="color: #1e293b; margin-top: 0;">Beste ${recipientName},</h3>
                        
                        <p style="color: #334155; line-height: 1.6;">
                            Vanwege een beveiligings- en AVG-update van ons systeem kan het zijn dat u vandaag (maandag 14 september) problemen heeft ondervonden bij het inloggen of het laden van het Stagebedrijf Portaal.
                        </p>
                        
                        <p style="color: #1e40af; line-height: 1.6; font-weight: bold;">
                            Onze welgemeende excuses voor het eventuele ongemak dat dit heeft veroorzaakt!
                        </p>
                        
                        <p style="color: #334155; line-height: 1.6;">
                            Wij willen u laten weten dat de update en de bijbehorende controles nu 100% succesvol zijn afgerond. Het portaal is per direct weer volledig en razendsnel beschikbaar.
                        </p>

                        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;">🔑 Inloggen op StageConnectie:</h4>
                            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13.5px; line-height: 1.6;">
                                <li>U kunt inloggen met uw e-mailadres (<strong>${r.email}</strong>) en uw eigen vertrouwde wachtwoord.</li>
                                <li>Mocht u uw wachtwoord niet meer weten, dan kunt u op de inlogpagina op <strong>"Wachtwoord vergeten"</strong> klikken om direct een e-mail te ontvangen waarmee u een nieuw wachtwoord kunt instellen.</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="https://ghpc.stageconnectie.nl/login.html" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Direct Inloggen op StageConnectie</a>
                        </div>

                        <p style="color: #334155; line-height: 1.6;">
                            Wij danken u hartelijk voor uw begrip en voor uw waardevolle samenwerking bij het begeleiden van onze stagiairs.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                            Met vriendelijke groet,<br>
                            <strong>het stageteam van Groene Hart Pro College</strong><br>
                            <span style="font-size: 12px; color: #94a3b8;">StageConnectie Support</span>
                        </p>
                    </div>
                `;

                try {
                    const sendRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_API_KEY}`
                        },
                        body: JSON.stringify({
                            from: 'StageConnectie <no-reply@stageconnectie.nl>',
                            to: r.email.trim(),
                            subject: subject || 'Belangrijke update: StageConnectie weer 100% operationeel',
                            html: personalizedHtml
                        })
                    });
                    const sendData = await sendRes.json();
                    results.push({ email: r.email, success: sendRes.ok, data: sendData });
                } catch (err) {
                    results.push({ email: r.email, success: false, error: err.message });
                }
            }

            return new Response(
                JSON.stringify({ success: true, count: results.length, results }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'request-password-reset') {
            if (!email) throw new Error('Email is verplicht');
            const cleanEmail = email.trim().toLowerCase();

            // Check if student (students cannot reset their password themselves)
            const { data: student } = await supabaseAdmin.from('Students').select('id').ilike('email', cleanEmail).maybeSingle();
            if (student) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Studenten kunnen hun wachtwoord niet zelf resetten. Neem contact op met je stagebegeleider.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }

            let userRole = role || 'employer';
            let userName = name || '';

            const { data: company } = await supabaseAdmin.from('Bedrijven').select('company_name, contact_person').ilike('email', cleanEmail).maybeSingle();
            if (company) {
                userRole = 'employer';
                userName = company.contact_person || company.company_name;
            } else {
                const { data: supervisor } = await supabaseAdmin.from('stagebegeleiders').select('name').ilike('email', cleanEmail).maybeSingle();
                if (supervisor) {
                    userRole = 'supervisor';
                    userName = supervisor.name;
                }
            }

            let resetActionLink = '';
            const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: cleanEmail,
                options: {
                    redirectTo: loginUrl || 'https://ghpc.stageconnectie.nl/reset-password.html'
                }
            });

            if (recoveryRes.error) {
                const inviteRes = await supabaseAdmin.auth.admin.generateLink({
                    type: 'invite',
                    email: cleanEmail,
                    options: {
                        redirectTo: loginUrl || 'https://ghpc.stageconnectie.nl/reset-password.html',
                        data: { role: userRole }
                    }
                });
                if (inviteRes.error) throw inviteRes.error;
                resetActionLink = inviteRes.data.properties?.action_link || '';
            } else {
                resetActionLink = recoveryRes.data.properties?.action_link || '';
            }

            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY && resetActionLink) {
                const subjectLine = 'Wachtwoord Herstellen - StageConnectie';
                const htmlContent = `
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #1e293b; margin: 0;">StageConnectie</h2>
                            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Groene Hart Pro College</p>
                        </div>
                        
                        <h3 style="color: #1e293b; margin-top: 0;">Beste ${userName || 'gebruiker'},</h3>
                        <p style="color: #334155; line-height: 1.6;">U heeft een verzoek ingediend om uw wachtwoord te herstellen voor StageConnectie.</p>
                        
                        <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Klik op de onderstaande knop om uw eigen wachtwoord in te stellen:</p>
                        
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${resetActionLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Nieuw Wachtwoord Instellen</a>
                        </div>

                        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                🔒 <strong>Heeft u dit niet aangevraagd?</strong><br>
                                Dan kunt u deze e-mail negeren. Uw account blijft gewoon veilig.
                            </p>
                        </div>

                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                            Met vriendelijke groet,<br>
                            <strong>het stageteam van Groene Hart Pro College</strong>
                        </p>
                    </div>
                `;

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: 'StageConnectie <no-reply@stageconnectie.nl>',
                        to: cleanEmail,
                        subject: subjectLine,
                        html: htmlContent
                    })
                });
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Password reset link sent from StageConnectie' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'list-auth-users') {
            const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            if (listErr) throw listErr;
            return new Response(
                JSON.stringify({ success: true, users: listData?.users || [] }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'unlink-student-company') {
            const { studentName, studentId } = metadata || {};
            let query = supabaseAdmin.from('Students').update({ company_id: null });
            if (studentId) {
                query = query.eq('id', studentId);
            } else if (studentName) {
                query = query.eq('name', studentName);
            } else {
                throw new Error('studentId or studentName is required');
            }
            const { data: updated, error: updateErr } = await query.select();
            if (updateErr) throw updateErr;
            return new Response(
                JSON.stringify({ success: true, updated }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'upsert-student') {
            const studentPayload = metadata?.student;
            if (!studentPayload) throw new Error('student metadata is required');

            // Sanitize payload to remove non-existent columns in Students table
            delete studentPayload.start_date;
            delete studentPayload.end_date;

            let existingQuery = supabaseAdmin.from('Students').select('id');
            if (studentPayload.email) {
                existingQuery = existingQuery.ilike('email', studentPayload.email);
            } else {
                existingQuery = existingQuery.ilike('name', studentPayload.name);
            }
            const { data: existing } = await existingQuery.maybeSingle();

            const runUpsert = async (payload: Record<string, any>) => {
                if (existing) {
                    const updatePayload = { ...payload };
                    delete updatePayload.id; // Preserve existing primary key ID to avoid breaking Attendance foreign keys
                    return await supabaseAdmin.from('Students').update(updatePayload).eq('id', existing.id).select();
                } else {
                    return await supabaseAdmin.from('Students').insert([payload]).select();
                }
            };

            let res = await runUpsert(studentPayload);
            if (res.error && res.error.message?.includes('column')) {
                const fallbackPayload = { ...studentPayload };
                delete fallbackPayload.stage_start_date;
                delete fallbackPayload.stage_end_date;
                delete fallbackPayload.company_assignments;
                res = await runUpsert(fallbackPayload);
            }

            if (res.error) throw res.error;
            return new Response(
                JSON.stringify({ success: true, student: res.data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'update-company') {
            const { companyId, companyPayload } = metadata || {};
            if (!companyId || !companyPayload) throw new Error('companyId and companyPayload are required');
            const { data: updated, error: err } = await supabaseAdmin.from('Bedrijven').update(companyPayload).eq('id', companyId).select();
            if (err) throw err;
            return new Response(
                JSON.stringify({ success: true, company: updated }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'upsert-company') {
            const companyPayload = metadata?.company;
            if (!companyPayload) throw new Error('company metadata is required');

            let existingQuery = supabaseAdmin.from('Bedrijven').select('id');
            if (companyPayload.email) {
                existingQuery = existingQuery.ilike('email', companyPayload.email);
            } else if (companyPayload.company_name) {
                existingQuery = existingQuery.ilike('company_name', companyPayload.company_name);
            }
            const { data: existing } = await existingQuery.maybeSingle();

            let res;
            if (existing) {
                const updatePayload = { ...companyPayload };
                delete updatePayload.id;
                res = await supabaseAdmin.from('Bedrijven').update(updatePayload).eq('id', existing.id).select();
            } else {
                res = await supabaseAdmin.from('Bedrijven').insert([companyPayload]).select();
            }

            if (res.error) throw res.error;
            return new Response(
                JSON.stringify({ success: true, company: res.data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'upsert-supervisor') {
            const supervisorPayload = metadata?.supervisor;
            if (!supervisorPayload) throw new Error('supervisor metadata is required');

            let existingQuery = supabaseAdmin.from('stagebegeleiders').select('id');
            if (supervisorPayload.email) {
                existingQuery = existingQuery.ilike('email', supervisorPayload.email);
            } else if (supervisorPayload.name) {
                existingQuery = existingQuery.ilike('name', supervisorPayload.name);
            }
            const { data: existing } = await existingQuery.maybeSingle();

            let res;
            if (existing) {
                const updatePayload = { ...supervisorPayload };
                delete updatePayload.id;
                res = await supabaseAdmin.from('stagebegeleiders').update(updatePayload).eq('id', existing.id).select();
            } else {
                res = await supabaseAdmin.from('stagebegeleiders').insert([supervisorPayload]).select();
            }

            if (res.error) throw res.error;
            return new Response(
                JSON.stringify({ success: true, supervisor: res.data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (action === 'restore-attendance') {
            const { records } = metadata || {};
            if (!records || !Array.isArray(records)) throw new Error('records array is required');

            const { data: students } = await supabaseAdmin.from('Students').select('id');
            const studentIds = new Set((students || []).map((s: any) => s.id));

            const { data: companies } = await supabaseAdmin.from('Bedrijven').select('id');
            const companyIds = new Set((companies || []).map((c: any) => c.id));

            const validRecords = records
                .filter((r: any) => studentIds.has(r.student_id))
                .map((r: any) => ({
                    student_id: r.student_id,
                    employer_id: r.employer_id && companyIds.has(r.employer_id) ? r.employer_id : null,
                    date: r.date,
                    status: r.status || null,
                    minutes_late: r.minutes_late || 0,
                    student_status: r.student_status || null,
                    student_hours: r.student_hours || null,
                    notes: r.notes || null
                }));

            const { data, error } = await supabaseAdmin.from('Attendance').upsert(validRecords, { onConflict: 'student_id,date' }).select();
            if (error) throw error;
            return new Response(
                JSON.stringify({ success: true, inputCount: records.length, restoredCount: validRecords.length, data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        let authUser;
        let actionLink = '';
        const isInvite = !password || password.trim() === '';

        if (isInvite) {
            // Genereer een uitnodigingslink (of recovery link als user al bestaat in auth.users)
            let inviteData, inviteError;
            const res = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    redirectTo: loginUrl,
                    data: {
                        role: role,
                        ...metadata
                    }
                }
            });

            inviteData = res.data;
            inviteError = res.error;

            if (inviteError && (inviteError.message?.includes('already been registered') || inviteError.message?.includes('already exists'))) {
                const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: email,
                    options: {
                        redirectTo: loginUrl
                    }
                });
                inviteData = recoveryRes.data;
                inviteError = recoveryRes.error;
            }

            if (inviteError) throw inviteError;
            authUser = inviteData;
            actionLink = inviteData.properties?.action_link || '';
        } else {
            // Maak de user aan met het meegegeven wachtwoord (of update als deze al bestaat)
            const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: role,
                    ...metadata
                },
                app_metadata: {
                    role: role,
                    ...metadata
                }
            })

            if (createError) {
                if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
                    // Update het wachtwoord van de bestaande gebruiker
                    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
                    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
                    if (existingUser) {
                        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                            existingUser.id,
                            {
                                password: password,
                                email_confirm: true,
                                user_metadata: {
                                    role: role,
                                    ...metadata
                                },
                                app_metadata: {
                                    role: role,
                                    ...metadata
                                }
                            }
                        )
                        if (updateError) throw updateError
                        authUser = updateData
                    } else {
                        throw createError
                    }
                } else {
                    throw createError
                }
            } else {
                authUser = createData
            }
        }

        const userId = authUser.user?.id

        // Send email if requested
        if (sendEmail) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
                let htmlContent = '';
                let subjectLine = '';

                if (isInvite) {
                    if (role === 'employer') {
                        const cleanEmpEmail = email.trim().toLowerCase();
                        let compId = metadata?.company_id || '';
                        if (!compId) {
                            const { data: compRow } = await supabaseAdmin.from('Bedrijven').select('id').ilike('email', cleanEmpEmail).maybeSingle();
                            compId = compRow?.id || '';
                        }
                        const etoken = await signEmployerToken({ cid: compId, email: cleanEmpEmail }, SERVICE_KEY);
                        const portalBase = (loginUrl && loginUrl.includes('employer-portal.html'))
                            ? loginUrl.split('?')[0]
                            : defaultPortalBase;
                        const passwordlessPortalLink = `${portalBase}?etoken=${encodeURIComponent(etoken)}`;

                        subjectLine = `Uitnodiging digitale aanwezigheidsregistratie - ${defaultSchoolName}`;
                        htmlContent = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                                <h2 style="color: #1e293b; margin-top: 0;">Beste ${name || 'stagebegeleider / werkgever'},</h2>
                                <p style="color: #334155; line-height: 1.6;">Wij nodigen u van harte uit voor de digitale aanwezigheidsregistratie van het <strong>${defaultSchoolName}</strong> via StageConnectie.</p>
                                <p style="color: #334155; line-height: 1.6;">Met behulp van deze website (geschikt voor smartphone, tablet en computer) kunt u <strong>met 1 klik</strong> de stage-uren van uw stagiair(s) goedkeuren of aanpassen — <strong>zonder dat u een wachtwoord hoeft aan te maken of te onthouden</strong>.</p>
                                
                                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Klik op de onderstaande knop om direct uw Stagebedrijf Portaal te openen:</p>
                                
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${passwordlessPortalLink}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">🚀 Direct Bedrijfsportaal Openen (Geen wachtwoord nodig)</a>
                                </div>

                                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                        💡 <strong>Geen wachtwoord meer nodig:</strong><br>
                                        Na 1 klik bent u direct ingelogd en onthoudt uw apparaat uw sessie automatisch. Ook ontvangt u op vrijdagmiddag alleen een kort berichtje met een <strong>"1-Klik Goedkeuren"</strong> knop als de week nog niet is ingevuld.<br><br>
                                        ✉️ <strong>Vragen?</strong><br>
                                        Neem gerust contact op met de stagecoördinator Willemien Vesseur (<a href="mailto:wvs@youscope.nl" style="color: #2563eb; text-decoration: underline; font-weight: 500;">wvs@youscope.nl</a>).
                                    </p>
                                </div>

                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                                    Met vriendelijke groet,<br>
                                    <strong>het stageteam van ${defaultSchoolName}</strong>
                                </p>
                            </div>
                        `;
                    } else {
                        subjectLine = 'Uitnodiging voor StageConnectie - Activeer je account';
                        htmlContent = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <h2 style="color: #1e293b;">Beste ${name || 'gebruiker'},</h2>
                                <p>Welkom bij StageConnectie! Er is een account voor je klaargezet in ons systeem.</p>
                                <p>Klik op de onderstaande knop om je account te activeren en je eigen wachtwoord in te stellen:</p>
                                <a href="${actionLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">Account Activeren & Wachtwoord Instellen</a>
                                <p style="font-size: 13px; color: #64748b; margin-top: 15px;">
                                    Na het instellen van je wachtwoord kun je inloggen op je vernieuwde portaal:<br>
                                    <a href="${loginUrl || 'https://ghpc.stageconnectie.nl/supervisor-portal.html'}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${loginUrl || 'https://ghpc.stageconnectie.nl/supervisor-portal.html'}</a><br><br>
                                    <em>Let op: Deze activatielink is beperkt geldig.</em>
                                </p>
                                <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                    Met vriendelijke groet,<br>het stageteam van Groene Hart Pro College
                                </p>
                            </div>
                        `;
                    }
                } else {
                    subjectLine = 'Welkom bij StageConnectie - Jouw Inloggegevens';
                    htmlContent = `
                        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #1e293b;">Beste ${name || 'gebruiker'},</h2>
                            <p>Welkom bij StageConnectie! Er is een account voor je aangemaakt in ons systeem.</p>
                            <p>Hieronder vind je jouw inloggegevens:</p>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                <strong>E-mailadres:</strong> ${email}<br>
                                <strong>Wachtwoord:</strong> ${password}
                            </div>
                            <p>Je kunt inloggen via de volgende link:</p>
                            <a href="${loginUrl || 'https://ghpc.stageconnectie.nl/login.html'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Naar het Portaal</a>
                            <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                We raden je aan om je wachtwoord te wijzigen nadat je voor de eerste keer bent ingelogd.<br><br>
                                Met vriendelijke groet,<br>het stageteam van Groene Hart Pro College
                            </p>
                        </div>
                    `;
                }

                const mailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${RESEND_API_KEY}` 
                    },
                    body: JSON.stringify({
                        from: 'StageConnectie <no-reply@stageconnectie.nl>',
                        to: email,
                        subject: subjectLine,
                        html: htmlContent
                    })
                });
                
                const resData = await mailResponse.json();
                console.log('Mail send response:', resData);
            } else {
                console.warn('RESEND_API_KEY niet geconfigureerd, mail niet verzonden.');
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Auth account created' + (sendEmail ? ' and email sent' : ''),
                user_id: authUser.user?.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
