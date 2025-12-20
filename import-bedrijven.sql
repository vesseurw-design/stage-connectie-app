-- Import bedrijven uit CSV
-- Gegenereerd op: 20 december 2024

-- Verwijder eerst alle oude fake bedrijven
DELETE FROM public."Bedrijven";

-- Voeg de 6 echte bedrijven toe
INSERT INTO public."Bedrijven" (id, company_name, contact_person, email, phone_number, access_code, auth_user_id)
VALUES
(gen_random_uuid(), 'Perspektief', 'Madelon Jautze', 'madelon@perspektiefacademie.nl', NULL, NULL, NULL),
(gen_random_uuid(), 'GSB', 'Mathijs Broer', 'info@gsbgrafischeafwerking.nl', NULL, NULL, NULL),
(gen_random_uuid(), 'Activite Zuidervaart', 'Rineke Heemskerk', 'r.heemskerk@activite.nl', NULL, NULL, NULL),
(gen_random_uuid(), 'Activite Noorderbrink', 'Petra Ooms', 'p.ooms@activite.nl', NULL, NULL, NULL),
(gen_random_uuid(), 'Timmerfabriek Koenekoop', 'Mart Koenekoop', 'info@timmerfabriekkoenekoop.nl', NULL, NULL, NULL),
(gen_random_uuid(), 'nagelgroothandel Korneliya', 'Alex van Harskamp', 'alexvanharskamp@hotmail.com', NULL, NULL, NULL);

-- Verificatie
SELECT 
    company_name,
    contact_person,
    email
FROM public."Bedrijven"
ORDER BY company_name;
