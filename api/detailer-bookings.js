/**
 * Detailer Bookings API Endpoint - SIMPLIFIED VERSION
 * GET /api/detailer-bookings - Get detailer's bookings
 */

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

    // Mock bookings for this detailer
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
        detailer_id: detailerId
      },
      {
        id: '3',
        naam: 'Peter Pieterse',
        email: 'peter@email.be',
        datum: '2026-04-17',
        tijd: '16:00',
        dienst: 'Wax coating',
        adres: 'Gent, België',
        totaal: 55,
        status: 'completed',
        detailer_id: detailerId
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
