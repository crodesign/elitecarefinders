-- Creates an RPC function to upsert a contact history entry
-- This allows users to add to the contact history without needing SELECT permission on the table,
-- traversing the RLS policy that prevents them from checking if an entry already exists for today.

CREATE OR REPLACE FUNCTION upsert_contact_history(
    p_contact_id UUID,
    p_user_id UUID,
    p_change_date DATE,
    p_changes_summary TEXT
) RETURNS void AS $$
DECLARE
    v_existing_id UUID;
    v_existing_summary TEXT;
    v_updated_summary TEXT;
BEGIN
    -- Check if an entry already exists for this contact on this date
    -- We can do this inside a SECURITY DEFINER function or by relying on
    -- the fact that the function runs with the privileges of the caller,
    -- but we need to bypass RLS here just for the check, or we can use an ON CONFLICT
    -- if we have a unique constraint. Since we don't have a unique constraint on (contact_id, change_date),
    -- we do a manual check. 
    -- To bypass RLS for this specific read, we can just let the function execute the select
    -- because functions by default don't bypass RLS unless SECURITY DEFINER is set, 
    -- but we CAN set SECURITY DEFINER to ensure the upsert works regardless of caller's SELECT policies.
    
    SELECT id, changes_summary INTO v_existing_id, v_existing_summary
    FROM public.contact_history
    WHERE contact_id = p_contact_id AND change_date = p_change_date
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Merge the summaries
        IF v_existing_summary LIKE '%<ul>%' AND p_changes_summary LIKE '%<ul>%' THEN
            -- Both are HTML lists, merge the list items
            v_updated_summary := REPLACE(v_existing_summary, '</ul>', '') || 
                                 REPLACE(p_changes_summary, '<ul>', '');
        ELSIF v_existing_summary LIKE '%<ul>%' THEN
            -- Existing is HTML list, append new item
            v_updated_summary := REPLACE(v_existing_summary, '</ul>', '<li>' || p_changes_summary || '</li></ul>');
        ELSE
            -- Just append or use the new one (if old format wasn't a list)
            -- For safety, convert both to a list
            v_updated_summary := '<ul><li>' || v_existing_summary || '</li>' ||
                                 REPLACE(REPLACE(p_changes_summary, '<ul>', ''), '</ul>', '') || '</ul>';
        END IF;

        -- Update the existing record
        UPDATE public.contact_history
        SET changes_summary = v_updated_summary,
            updated_at = NOW()
        WHERE id = v_existing_id;
    ELSE
        -- Insert a new record
        INSERT INTO public.contact_history (
            contact_id,
            user_id,
            change_date,
            changes_summary
        ) VALUES (
            p_contact_id,
            p_user_id,
            p_change_date,
            p_changes_summary
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
