-- =============================================================================
-- AUTOMATISCHE VRIJDAGMIDDAG HERINNERING (15:30 uur)
-- Verstuurt elke vrijdagmiddag automatisch een 1-klik goedkeuringsmail
-- ALLEEN naar actieve stagebedrijven die deze week nog NIETS hebben ingevuld.
-- =============================================================================
-- Voer dit script eenmalig uit in de Supabase SQL Editor.

-- 1. Activeer de benodigde extensies voor geplande taken en HTTP-aanroepen
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Verwijder een eventuele eerdere versie van deze cronjob zodat hij nooit dubbel staat
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'friday-unfilled-company-reminder') THEN
        PERFORM cron.unschedule('friday-unfilled-company-reminder');
    END IF;
END $$;

-- =============================================================================
-- OPTIE 1: VOOR GROENE HART PRO COLLEGE (vdeipnqyesduiohxvuvu)
-- Elke vrijdag om 13:30 UTC (15:30 uur Nederlandse zomertijd / 14:30 uur wintertijd)
-- =============================================================================
SELECT cron.schedule(
    'friday-unfilled-company-reminder',
    '30 13 * * 5',
    $$
    SELECT net.http_post(
        url := 'https://vdeipnqyesduiohxvuvu.supabase.co/functions/v1/create-auth-account',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"action": "send-weekly-unfilled-reminders", "dryRun": false, "baseUrl": "https://ghpc.stageconnectie.nl"}'::jsonb
    );
    $$
);

-- =============================================================================
-- OPTIE 2: VOOR DE POORT PRAKTIJKONDERWIJS (vvfvakpnotvehjcndrxh)
-- (Gebruik onderstaand blok wanneer je dit in de Supabase SQL Editor van De Poort uitvoert)
-- =============================================================================
/*
SELECT cron.schedule(
    'friday-unfilled-company-reminder',
    '30 13 * * 5',
    $$
    SELECT net.http_post(
        url := 'https://vvfvakpnotvehjcndrxh.supabase.co/functions/v1/create-auth-account',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"action": "send-weekly-unfilled-reminders", "dryRun": false, "baseUrl": "https://depoort.stageconnectie.nl"}'::jsonb
    );
    $$
);
*/
