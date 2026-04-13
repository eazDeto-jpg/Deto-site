/**
 * Customer Login API Endpoint
 * POST /api/customer-login - Customer login
 * POST /api/customer-register - Customer registration
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

  try {
    if (req.method === 'POST') {
      const { action } = req.query;
      
      if (action === 'register') {
        return handleRegister(req, res);
      } else {
        return handleLogin(req, res);
      }
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * Handle customer login
 */
async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email en wachtwoord zijn verplicht' });
  }

  try {
    // Mock customers database
    const customers = {
      'mepore1769@lealking.com': { 
        id: 'cust_001', 
        naam: 'Mepore User', 
        email: 'mepore1769@lealking.com',
        password: 'Kokomelon',
        voornaam: 'Mepore',
        achternaam: 'User'
      },
      'jan@email.be': { 
        id: 'cust_002', 
        naam: 'Jan Jansen', 
        email: 'jan@email.be',
        password: 'password123',
        voornaam: 'Jan',
        achternaam: 'Jansen'
      }
    };

    const customer = customers[email];
    
    if (!customer) {
      return res.status(401).json({ success: false, error: 'E-mailadres niet gevonden' });
    }

    if (customer.password !== password) {
      return res.status(401).json({ success: false, error: 'Ongeldig wachtwoord' });
    }

    // Generate token
    const token = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      success: true,
      token,
      id: customer.id,
      naam: customer.naam,
      voornaam: customer.voornaam,
      achternaam: customer.achternaam,
      email: customer.email
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Login mislukt' });
  }
}

/**
 * Handle customer registration
 */
async function handleRegister(req, res) {
  const { voornaam, achternaam, email, password, password2 } = req.body;

  if (!voornaam || !achternaam || !email || !password) {
    return res.status(400).json({ success: false, error: 'Alle velden zijn verplicht' });
  }

  if (password !== password2) {
    return res.status(400).json({ success: false, error: 'Wachtwoorden komen niet overeen' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Wachtwoord moet minstens 6 tekens zijn' });
  }

  try {
    // Check if email already exists
    const customers = {
      'mepore1769@lealking.com': true,
      'jan@email.be': true
    };

    if (customers[email]) {
      return res.status(400).json({ success: false, error: 'Dit e-mailadres is al geregistreerd' });
    }

    // Generate customer ID
    const customerId = 'cust_' + Date.now();

    // Generate token
    const token = Buffer.from(`${customerId}:${Date.now()}`).toString('base64');

    return res.status(201).json({
      success: true,
      token,
      id: customerId,
      naam: `${voornaam} ${achternaam}`,
      voornaam,
      achternaam,
      email,
      message: 'Account aangemaakt! Je bent nu ingelogd.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Registratie mislukt' });
  }
}
