import { supabase } from './_supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { email, wachtwoord } = req.body;

    try {
      // For detailers, we check the detailers table
      // Note: In a real app, you'd use Supabase Auth for detailers too, 
      // but here we follow the existing schema which has a detailers table with password hashes.
      const { data: detailer, error } = await supabase
        .from('detailers')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !detailer) {
        return res.status(401).json({ success: false, error: 'Detailer niet gevonden' });
      }

      // Simple password check (should use bcrypt in production)
      if (detailer.wachtwoord_hash !== wachtwoord) {
        return res.status(401).json({ success: false, error: 'Ongeldig wachtwoord' });
      }

      return res.status(200).json({
        success: true,
        id: detailer.id,
        naam: detailer.naam,
        token: detailer.token,
        moet_wachtwoord_wijzigen: detailer.moet_wachtwoord_wijzigen
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, nieuw_wachtwoord } = req.body;
    try {
      const { error } = await supabase
        .from('detailers')
        .update({ 
          wachtwoord_hash: nieuw_wachtwoord,
          moet_wachtwoord_wijzigen: false 
        })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
