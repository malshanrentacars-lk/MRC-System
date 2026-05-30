#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  try {
    const passwordHash = bcrypt.hashSync('Admin@1234', 10);

    const adminUser = {
      username: 'amil',
      full_name: 'Amil Admin',
      email: 'amil@mrc.lk',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
    };

    const { data, error } = await supabase
      .from('users')
      .upsert([adminUser], { onConflict: 'username' })
      .select('username, full_name, email, role, is_active')
      .single();

    if (error) {
      console.error('Supabase error:', error.message || error);
      process.exit(1);
    }

    console.log('Default admin reset successfully:', data);
    console.log('Login with username=amil and password=Admin@1234');
  } catch (err) {
    console.error('Reset failed:', err.message || err);
    process.exit(1);
  }
})();