/**
 * Detailer Bookings API Endpoint
 * GET /api/detailer-bookings - Get detailer's bookings
 * PATCH /api/detailer-bookings - Update booking status
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
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-detailer-token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify detailer token
    const token = req.headers['x-detailer-token'];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Detailer token required' });
    }

    // Decode token to get detailer ID
    let detailerId;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      detailerId = decoded.split(':')[0];
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (req.method === 'GET') {
      return handleGetBookings(req, res, detailerId);
    } else if (req.method === 'PATCH') {
      return handleUpdateBooking(req, res, detailerId);
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get detailer's bookings
 */
async function handleGetBookings(req, res, detailerId) {
  try {
    const { status, from, to } = req.query;

    let query = supabase
      .from('boekingen')
      .select('*')
      .eq('detailer_id', detailerId);

    if (status) query = query.eq('status', status);
    if (from) query = query.gte('datum', from);
    if (to) query = query.lte('datum', to);

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
    console.error('Get bookings error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update booking status
 */
async function handleUpdateBooking(req, res, detailerId) {
  const { bookingId, status } = req.body;

  if (!bookingId || !status) {
    return res.status(400).json({ success: false, error: 'Booking ID en status zijn verplicht' });
  }

  try {
    // Verify booking belongs to detailer
    const { data: booking } = await supabase
      .from('boekingen')
      .select('id')
      .eq('id', bookingId)
      .eq('detailer_id', detailerId)
      .single();

    if (!booking) {
      return res.status(403).json({ success: false, error: 'Booking niet gevonden' });
    }

    // Update status
    const { data, error } = await supabase
      .from('boekingen')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Boeking bijgewerkt'
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
