/**
 * Seed script: Insert the first admin user into D1
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires D1_API_TOKEN and NEXT_PUBLIC_D1_API_URL in .env.local
 */

import bcrypt from 'bcryptjs';

// ---- Configuration ----
const ADMIN_EMAIL = 'admin@shweloader.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123!'; // Change this after first login
const BCRYPT_ROUNDS = 12;

// ---- D1 REST API config ----
const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  'https://cloudflare-d1-rest-api.shweloader.workers.dev';
const D1_API_TOKEN = process.env.D1_API_TOKEN || '';

async function seedAdmin() {
  console.log('Seeding admin user...\n');

  // Hash the password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Username: ${ADMIN_USERNAME}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Hash:     ${passwordHash.slice(0, 20)}...`);

  // Check if admin already exists
  const checkRes = await fetch(`${D1_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({
      query: 'SELECT user_id, email FROM admin_user WHERE email = ? LIMIT 1',
      params: [ADMIN_EMAIL],
    }),
  });

  const checkData = await checkRes.json();

  if (checkData.results && checkData.results.length > 0) {
    console.log(
      `\n  Admin user "${ADMIN_EMAIL}" already exists (user_id: ${checkData.results[0].user_id}). Skipping.`
    );
    return;
  }

  // Insert the admin user
  const insertRes = await fetch(`${D1_BASE_URL}/rest/admin_user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      active: 1,
    }),
  });

  const insertData = await insertRes.json();

  if (insertData.success) {
    console.log('\n  Admin user created successfully!');
    console.log(
      `  You can now log in with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`
    );
    console.log('  IMPORTANT: Change this password after first login.');
  } else {
    console.error('\n  Failed to create admin user.');
    console.error('  Status:', insertRes.status);
    console.error('  Response:', JSON.stringify(insertData, null, 2));
    process.exit(1);
  }
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
