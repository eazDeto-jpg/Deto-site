/**
 * Detailer Login API Endpoint
 * POST /api/detailer-login - Authenticate detailer
 * PATCH /api/detailer-login - Change password
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      return handleLogin(req, res);
    } else if (req.method === 'PATCH') {
      return handleChangePassword(req, res);
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle detailer login
 */
async function handleLogin(req, res) {
  const { email, wachtwoord } = req.body;

  if (!email || !wachtwoord) {
    return res.status(400).json({ success: false, error: 'Email en wachtwoord zijn verplicht' });
  }

  try {
    // Query detailers table
    const { data: detailer, error } = await supabase
      .from('detailers')
      .select('id, email, wachtwoord, naam, moet_wachtwoord_wijzigen')
      .eq('email', email)
      .single();

    if (error || !detailer) {
      return res.status(401).json({ success: false, error: 'Detailer niet gevonden' });
    }

    // Simple password check (in production, use bcrypt!)
    if (detailer.wachtwoord !== wachtwoord) {
      return res.status(401).json({ success: false, error: 'Ongeldig wachtwoord' });
    }

    // Generate simple token (in production, use JWT!)
    const token = Buffer.from(`${detailer.id}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      success: true,
      token,
      id: detailer.id,
      naam: detailer.naam,
      moet_wachtwoord_wijzigen: detailer.moet_wachtwoord_wijzigen || false
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Login mislukt' });
  }
}

/**
 * Handle password change
 */
async function handleChangePassword(req, res) {
  const { token, nieuw_wachtwoord } = req.body;

  if (!token || !nieuw_wachtwoord) {
    return res.status(400).json({ success: false, error: 'Token en wachtwoord zijn verplicht' });
  }

  if (nieuw_wachtwoord.length < 6) {
    return res.status(400).json({ success: false, error: 'Wachtwoord moet minstens 6 tekens zijn' });
  }

  try {
    // Decode token to get detailer ID
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const detailerId = decoded.split(':')[0];

    // Update password
    const { error } = await supabase
      .from('detailers')
      .update({
        wachtwoord: nieuw_wachtwoord,
        moet_wachtwoord_wijzigen: false
      })
      .eq('id', detailerId);

    if (error) {
      return res.status(500).json({ success: false, error: 'Wachtwoord wijzigen mislukt' });
    }

    return res.status(200).json({ success: true, message: 'Wachtwoord gewijzigd' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, error: 'Fout bij wachtwoord wijzigen' });
  }
}
