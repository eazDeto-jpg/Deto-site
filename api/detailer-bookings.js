import { supabase } from './_supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-detailer-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const detailerToken = req.headers['x-detailer-token'];
  if (!detailerToken) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Find detailer by token
    const { data: detailer, error: dError } = await supabase
      .from('detailers')
      .select('id')
      .eq('token', detailerToken)
      .single();

    if (dError || !detailer) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('boekingen')
        .select('*', { count: 'exact' })
        .eq('detailer_id', detailer.id)
        .order('datum', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, bookings: data, count });
    }

    if (req.method === 'PATCH') {
      const { id, action } = req.body;
      if (action === 'complete') {
        const { data, error } = await supabase
          .from('boekingen')
          .update({ afgerond: true, status: 'completed' })
          .eq('id', id)
          .eq('detailer_id', detailer.id)
          .select();
        if (error) throw error;
        return res.status(200).json({ success: true, booking: data[0] });
      }
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
