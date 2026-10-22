-- Allow threads without a registered user
ALTER TABLE public.threads ALTER COLUMN user_id DROP NOT NULL;

-- Add identification columns
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS visitor_name TEXT;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS visitor_document TEXT;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS visitor_email TEXT;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS visitor_phone TEXT;

-- Update RLS to allow anonymous access
-- Note: In a production environment, you might want more restrictive policies.
-- For now, we allow anyone to create a thread and read it if they know the ID.
CREATE POLICY "Anyone can create a thread" ON public.threads
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read a thread by ID" ON public.threads
FOR SELECT USING (true);

CREATE POLICY "Anyone can update their thread" ON public.threads
FOR UPDATE USING (true);

-- Also need to allow messages for anonymous threads
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert messages to any thread" ON public.messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read messages from any thread" ON public.messages
FOR SELECT USING (true);

-- Ensure grants are correct
GRANT ALL ON public.threads TO anon, authenticated, service_role;
GRANT ALL ON public.messages TO anon, authenticated, service_role;
