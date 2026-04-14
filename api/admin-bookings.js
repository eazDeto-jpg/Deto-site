import { supabase } from './_supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error, count } = await supabase
        .from('boekingen')
        .select('*', { count: 'exact' })
        .order('datum', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, bookings: data, count });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    try {
      const { data, error } = await supabase
        .from('boekingen')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return res.status(200).json({ success: true, booking: data[0] });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
