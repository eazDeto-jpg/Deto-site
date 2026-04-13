/**
 * Detailers API Endpoint
 * GET /api/detailers - Get all detailers (admin only)
 * POST /api/detailers - Create new detailer (admin only)
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
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify admin secret
    const adminSecret = req.headers['x-admin-secret'];
    if (!adminSecret) {
      return res.status(401).json({ success: false, error: 'Admin secret required' });
    }

    if (req.method === 'GET') {
      return handleGetDetailers(req, res);
    } else if (req.method === 'POST') {
      return handleCreateDetailer(req, res);
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all detailers
 */
async function handleGetDetailers(req, res) {
  try {
    const { data, error } = await supabase
      .from('detailers')
      .select('id, naam, email, phone, average_rating, total_bookings, status')
      .order('naam');

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Get detailers error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create new detailer
 */
async function handleCreateDetailer(req, res) {
  const { naam, email, wachtwoord, phone } = req.body;

  if (!naam || !email || !wachtwoord) {
    return res.status(400).json({ success: false, error: 'Naam, email en wachtwoord zijn verplicht' });
  }

  try {
    const { data, error } = await supabase
      .from('detailers')
      .insert({
        naam,
        email,
        wachtwoord,
        phone: phone || '',
        status: 'active',
        average_rating: 0,
        total_bookings: 0
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      data,
      message: 'Detailer aangemaakt'
    });
  } catch (error) {
    console.error('Create detailer error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
