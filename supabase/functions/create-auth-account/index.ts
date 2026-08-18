import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, role, metadata, sendEmail, name, loginUrl } = await req.json()

        // Create Supabase client with Admin rights
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        let authUser;
        let actionLink = '';
        const isInvite = !password || password.trim() === '';

        if (isInvite) {
            // Genereer een uitnodigingslink (dit maakt ook de user aan in auth.users in 'invited' status)
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    redirectTo: loginUrl,
                    data: {
                        role: role,
                        ...metadata
                    }
                }
            })

            if (inviteError) throw inviteError
            authUser = inviteData
            actionLink = inviteData.properties.action_link
        } else {
            // Maak de user aan met het meegegeven wachtwoord
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

            if (createError) throw createError
            authUser = createData
        }

        const userId = authUser.user?.id

        // Send email if requested
        if (sendEmail) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
                let htmlContent = '';
                let subjectLine = '';

                if (isInvite) {
                    subjectLine = 'Uitnodiging voor StageConnectie - Activeer je account';
                    htmlContent = `
                        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #1e293b;">Beste ${name || 'gebruiker'},</h2>
                            <p>Welkom bij StageConnectie! Er is een account voor je klaargezet in ons systeem.</p>
                            <p>Klik op de onderstaande knop om je account te activeren en je eigen wachtwoord in te stellen:</p>
                            <a href="${actionLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">Account Activeren</a>
                            <p style="font-size: 13px; color: #64748b; margin-top: 15px;">
                                Na het activeren kun je inloggen met je e-mailadres en je zelfgekozen wachtwoord.<br>
                                Deze link is beperkt geldig.
                            </p>
                            <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                Met vriendelijke groet,<br>Het StageConnectie Team
                            </p>
                        </div>
                    `;
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
                            <a href="${loginUrl || 'https://stageconnectie.nl'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Naar het Portaal</a>
                            <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                We raden je aan om je wachtwoord te wijzigen nadat je voor de eerste keer bent ingelogd.<br><br>
                                Met vriendelijke groet,<br>Het StageConnectie Team
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
