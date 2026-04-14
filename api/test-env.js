export default function handler(req, res) {
  res.status(200).json({
    has_admin_password: !!process.env.ADMIN_PASSWORD,
    has_admin_secret: !!process.env.ADMIN_SECRET,
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
    node_env: process.env.NODE_ENV,
    admin_password_length: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.length : 0,
    admin_password_value_masked: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.substring(0, 2) + '...' : 'none'
  });
}
