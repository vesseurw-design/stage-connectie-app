# 🛡️ Rate Limiting Setup

## Wat is Rate Limiting?

Rate limiting voorkomt dat hackers:
- Duizenden wachtwoorden proberen (brute force)
- De server overbelasten (DDoS)
- Spam accounts aanmaken

## Supabase Ingebouwde Rate Limiting

Supabase heeft automatisch rate limiting voor:
- ✅ Login pogingen
- ✅ Password resets
- ✅ Email verificaties

**Standaard limieten:**
- 60 requests per minuut per IP
- 5 failed login attempts → 15 min lockout

## Extra Rate Limiting Toevoegen

### 1. Via Supabase Dashboard

1. Ga naar: https://supabase.com/dashboard/project/vdeipnqyesduiohxvuvu/settings/auth
2. Scroll naar **"Rate Limits"**
3. Stel in:
   - **Max sign-in attempts**: 5 per uur
   - **Max password reset requests**: 3 per uur
   - **Lockout duration**: 15 minuten

### 2. Via Edge Functions (Custom)

Voor extra controle kunnen we rate limiting toevoegen aan Edge Functions:

```typescript
// Rate limiting met Upstash Redis (gratis tier)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL'),
  token: Deno.env.get('UPSTASH_REDIS_TOKEN'),
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
});

// In je Edge Function:
const identifier = req.headers.get("x-forwarded-for") || "anonymous";
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return new Response("Too many requests", { status: 429 });
}
```

### 3. Via Vercel (Frontend)

Vercel heeft automatisch DDoS protection en rate limiting op:
- 100 requests per 10 seconden per IP
- Automatische bot detection

## Aanbevolen Setup

**Voor nu (makkelijk):**
1. ✅ Vertrouw op Supabase's ingebouwde rate limiting
2. ✅ Vercel's DDoS protection
3. ✅ Monitor in Supabase logs

**Later (als je groeit):**
1. Voeg Upstash Redis toe (gratis tier: 10,000 requests/dag)
2. Custom rate limiting per endpoint
3. IP whitelisting voor admins

## Monitoring

**Check of rate limiting werkt:**

1. Ga naar Supabase → Logs → Auth Logs
2. Zoek naar "rate_limit_exceeded"
3. Check IP adressen die geblokkeerd zijn

**Test het:**
```bash
# Probeer 10x snel in te loggen met verkeerd wachtwoord
# Je zou geblokkeerd moeten worden na 5 pogingen
```

## Security Headers (Bonus)

Voeg deze toe aan `vercel.json` voor extra security:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

## Status

- ✅ **Supabase Auth Rate Limiting**: Actief (standaard)
- ✅ **Vercel DDoS Protection**: Actief (automatisch)
- ⏳ **Custom Edge Function Rate Limiting**: Optioneel (later)
- ⏳ **Security Headers**: Te implementeren

## Volgende Stappen

1. Check Supabase Auth settings (zie boven)
2. Voeg security headers toe aan vercel.json
3. Monitor logs voor verdachte activiteit
4. Overweeg Upstash Redis als je meer controle wilt

---

**Je app is al redelijk beschermd!** 🛡️
