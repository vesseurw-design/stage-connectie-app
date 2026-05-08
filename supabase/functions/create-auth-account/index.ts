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

        // Create the user with admin privileges
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

        if (authError) throw authError

        // Send email if requested
        if (sendEmail) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
                const mailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${RESEND_API_KEY}` 
                    },
                    body: JSON.stringify({
                        from: 'StageConnectie <no-reply@stageconnectie.nl>',
                        to: email,
                        subject: 'Welkom bij StageConnectie - Jouw Inloggegevens',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
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
                        `
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
