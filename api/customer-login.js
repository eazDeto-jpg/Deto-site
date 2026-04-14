import { supabase } from './_supabase';

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

  const { action } = req.query;
  const { email, password, voornaam, achternaam } = req.body;

  try {
    if (action === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            voornaam,
            achternaam,
            full_name: \`\${voornaam} \${achternaam}\`
          }
        }
      });

      if (error) throw error;

      // Also create a record in the customers table if it exists
      if (data.user) {
        await supabase.from('customers').upsert({
          id: data.user.id,
          email: email,
          full_name: \`\${voornaam} \${achternaam}\`
        });
      }

      return res.status(200).json({
        success: true,
        user: data.user,
        session: data.session
      });
    } else {
      // Default: Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        user: data.user,
        session: data.session
      });
    }
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
