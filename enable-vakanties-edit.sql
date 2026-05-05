-- Allow inserting new holidays
CREATE POLICY "Vakanties_insert_all" ON public."Vakanties"
    FOR INSERT
    WITH CHECK (true);

-- Allow deleting holidays
CREATE POLICY "Vakanties_delete_all" ON public."Vakanties"
    FOR DELETE
    USING (true);
