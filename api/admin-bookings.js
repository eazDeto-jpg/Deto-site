/**
 * Admin Bookings API Endpoint
 * GET /api/admin-bookings - Get all bookings (admin only)
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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify admin secret
    const adminSecret = req.headers['x-admin-secret'];
    if (!adminSecret) {
      return res.status(401).json({ success: false, error: 'Admin secret required' });
    }

    // Get query parameters
    const { from, to, search, status } = req.query;

    // Build query
    let query = supabase
      .from('boekingen')
      .select('*');

    // Apply filters
    if (from) query = query.gte('datum', from);
    if (to) query = query.lte('datum', to);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('email', `%${search}%`);

    // Order by date descending
    query = query.order('datum', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
