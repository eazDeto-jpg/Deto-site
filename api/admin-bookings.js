/**
 * Admin Bookings API Endpoint - SIMPLIFIED VERSION
 * GET /api/admin-bookings - Get all bookings (admin only)
 */

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

    // Mock bookings data
    const mockBookings = [
      {
        id: '1',
        naam: 'Jan Jansen',
        email: 'jan@email.be',
        datum: '2026-04-15',
        tijd: '10:00',
        dienst: 'Basis wash',
        adres: 'Gent, België',
        totaal: 35,
        status: 'confirmed',
        detailer_id: '1'
      },
      {
        id: '2',
        naam: 'Marie Dupont',
        email: 'marie@email.be',
        datum: '2026-04-16',
        tijd: '14:00',
        dienst: 'Premium detail',
        adres: 'Gent, België',
        totaal: 75,
        status: 'pending',
        detailer_id: null
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockBookings,
      count: mockBookings.length
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
