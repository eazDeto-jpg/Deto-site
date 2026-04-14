export default function handler(req, res) {
  res.status(200).json({
    has_admin_password: !!process.env.ADMIN_PASSWORD,
    has_admin_secret: !!process.env.ADMIN_SECRET,
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
    node_env: process.env.NODE_ENV
  });
}
