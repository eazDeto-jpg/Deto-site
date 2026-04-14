import { supabase } from './_supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('detailers')
        .select('*', { count: 'exact' });
      if (error) throw error;
      return res.status(200).json({ success: true, detailers: data, count });
    }

    if (req.method === 'POST') {
      const { naam, email, wachtwoord_hash, regio } = req.body;
      const token = Buffer.from(\`\${email}:\${Date.now()}\`).toString('base64');
      const { data, error } = await supabase
        .from('detailers')
        .insert([{ naam, email, wachtwoord_hash, regio, token }])
        .select();
      if (error) throw error;
      return res.status(201).json({ success: true, detailer: data[0] });
    }

    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;
      const { data, error } = await supabase
        .from('detailers')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json({ success: true, detailer: data[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { error } = await supabase
        .from('detailers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
