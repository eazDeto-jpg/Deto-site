/**
 * Customer Bookings API Endpoint
 * GET /api/customer-bookings - Get customer's bookings
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-customer-token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify customer token
    const token = req.headers['x-customer-token'];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Customer token required' });
    }

    // Decode token to get customer ID
    let customerId;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      customerId = decoded.split(':')[0];
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Mock bookings for this customer
    const mockBookings = [
      {
        id: '1',
        datum: '2026-04-15',
        tijd: '10:00',
        dienst: 'Basis wash',
        adres: 'Gent, België',
        totaal: 35,
        status: 'confirmed',
        customer_id: customerId
      },
      {
        id: '2',
        datum: '2026-04-20',
        tijd: '14:00',
        dienst: 'Premium detail',
        adres: 'Gent, België',
        totaal: 75,
        status: 'pending',
        customer_id: customerId
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
