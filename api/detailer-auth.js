export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { password } = req.body;
  let adminPassword = process.env.ADMIN_PASSWORD;
  
  // If the environment variable is missing or empty, use the fallback
  if (!adminPassword || adminPassword.trim() === '') {
    adminPassword = 'admin123';
  }

  console.log('Login attempt:', { 
    received_pw_len: password ? password.length : 0, 
    expected_pw_len: adminPassword.length,
    match: password === adminPassword 
  });

  if (password === adminPassword) {
    return res.status(200).json({
      success: true,
      secret: process.env.ADMIN_SECRET,
      message: 'Admin login succesvol'
    });
  } else {
    return res.status(401).json({ success: false, error: 'Ongeldig admin wachtwoord' });
  }
}
