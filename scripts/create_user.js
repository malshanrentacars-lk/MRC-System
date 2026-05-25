const fs = require('fs');
const path = require('path');

// Load .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
  try {
    const plainPassword = '1999';
    const hash = bcrypt.hashSync(plainPassword, 10);

    const user = {
      username: 'chanuka',
      full_name: 'Chanuka',
      email: 'chanuka@mrc.local',
      password_hash: hash,
      role: 'employee',
      is_active: true,
    };

    const { data, error } = await supabase.from('users').upsert([user], { onConflict: 'username' }).select().single();
    if (error) {
      console.error('Supabase error:', error.message || error);
      process.exit(1);
    }

    console.log('Upserted user:', data);
    console.log('You can now log in with username=chanuka and password=1999');
  } catch (e) {
    console.error('Unexpected error:', e.message || e);
    process.exit(3);
  }
})();
