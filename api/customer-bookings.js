import { supabase } from './_supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify the user with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('boekingen')
        .select('*', { count: 'exact' })
        .eq('email', user.email) // Match by email as per current schema
        .order('datum', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, bookings: data, count });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
