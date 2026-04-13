/**
 * Admin Authentication Endpoint
 * POST /api/detailer-auth - Authenticate admin
 */

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Wachtwoord is verplicht' });
    }

    // Admin password from environment variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Ongeldig wachtwoord' });
    }

    // Generate admin secret
    const secret = Buffer.from(`admin:${Date.now()}:${Math.random()}`).toString('base64');

    return res.status(200).json({
      success: true,
      secret,
      message: 'Admin ingelogd'
    });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, error: 'Authenticatie mislukt' });
  }
}
