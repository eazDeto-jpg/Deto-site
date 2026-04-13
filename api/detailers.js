/**
 * Detailers API Endpoint - SIMPLIFIED VERSION
 * GET /api/detailers - Get all detailers (admin only)
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

    // Mock detailers data
    const mockDetailers = [
      {
        id: '1',
        naam: 'John Detailer',
        email: 'detailer@email.be',
        phone: '+32 123 456 789',
        average_rating: 4.9,
        total_bookings: 45,
        status: 'active'
      },
      {
        id: '2',
        naam: 'Jane Detailer',
        email: 'detailer2@email.be',
        phone: '+32 987 654 321',
        average_rating: 4.8,
        total_bookings: 32,
        status: 'active'
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockDetailers,
      count: mockDetailers.length
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
