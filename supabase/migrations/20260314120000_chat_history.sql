CREATE TABLE IF NOT EXISTS public.user_chat_history (
    user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    messages  jsonb    NOT NULL DEFAULT '[]',
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat history"
    ON public.user_chat_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
