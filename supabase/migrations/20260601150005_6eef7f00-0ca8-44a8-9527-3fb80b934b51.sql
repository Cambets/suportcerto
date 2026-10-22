
-- Allow anonymous visitors to use the public chat (threads + messages)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon;

-- THREADS: anon policies (visitor chat is anonymous; no auth.uid)
CREATE POLICY "Anon can insert threads"
  ON public.threads FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anon can select threads"
  ON public.threads FOR SELECT TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anon can update threads"
  ON public.threads FOR UPDATE TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anon can delete threads"
  ON public.threads FOR DELETE TO anon
  USING (user_id IS NULL);

-- MESSAGES: anon can read/insert messages for anonymous threads
CREATE POLICY "Anon can insert messages"
  ON public.messages FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = messages.thread_id AND t.user_id IS NULL
  ));

CREATE POLICY "Anon can select messages"
  ON public.messages FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = messages.thread_id AND t.user_id IS NULL
  ));
