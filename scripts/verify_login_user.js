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
const username = process.argv[2] || 'amil';
const password = process.argv[3] || 'Admin@1234';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username, full_name, email, password_hash, role, is_active')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !data) {
      console.error(`User not found: ${username}`);
      if (error) console.error(error.message || error);
      process.exit(1);
    }

    const passwordMatch = await bcrypt.compare(password, data.password_hash);
    console.log('User found:', {
      username: data.username,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      is_active: data.is_active,
      password_match: passwordMatch,
    });

    if (!data.is_active) {
      console.error('Account is inactive.');
      process.exit(1);
    }

    if (!passwordMatch) {
      console.error('Password hash does not match the supplied password.');
      process.exit(1);
    }

    console.log('Login credentials are valid for this Supabase project.');
  } catch (err) {
    console.error('Verification failed:', err.message || err);
    process.exit(1);
  }
})();