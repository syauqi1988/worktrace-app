
-- Profiles: cancellation columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancelled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_support_visit timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ticket_count integer DEFAULT 0;

-- Subscription events
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  event_type text NOT NULL,
  plan text,
  billing_period text,
  amount numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own events" ON subscription_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own events" ON subscription_events FOR INSERT WITH CHECK (user_id = auth.uid());

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  user_name text,
  user_plan text,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open',
  attachments jsonb DEFAULT '[]',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tickets" ON support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create own tickets" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own tickets" ON support_tickets FOR UPDATE USING (user_id = auth.uid());

-- Ticket replies
CREATE TABLE IF NOT EXISTS ticket_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES support_tickets NOT NULL,
  user_id uuid REFERENCES auth.users,
  sender_type text NOT NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own replies" ON ticket_replies FOR SELECT USING (
  ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
);
CREATE POLICY "Users create replies" ON ticket_replies FOR INSERT WITH CHECK (
  ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()) AND sender_type = 'user'
);

-- App counters for ticket numbers
CREATE TABLE IF NOT EXISTS app_counters (
  key text PRIMARY KEY,
  value integer DEFAULT 0
);
ALTER TABLE app_counters ENABLE ROW LEVEL SECURITY;
INSERT INTO app_counters (key, value) VALUES ('ticket_count', 0) ON CONFLICT (key) DO NOTHING;

-- Ticket number generator
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  counter integer;
BEGIN
  UPDATE app_counters SET value = value + 1 WHERE key = 'ticket_count' RETURNING value INTO counter;
  RETURN 'TKT-' || LPAD(counter::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION generate_ticket_number() TO authenticated;

-- Ticket attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users upload ticket attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own ticket attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
