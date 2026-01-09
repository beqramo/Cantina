/**
 * Quick test script for Resend email
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/test-email.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Resend } from 'resend';

async function testEmail() {
  console.log('=== Resend Email Test ===\n');

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || 'beqa31198@gmail.com';

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Sending to: ${adminEmail}`);
  console.log('');

  const resend = new Resend(apiKey);

  try {
    console.log('Sending test email...');

    const result = await resend.emails.send({
      from: 'Cantina <onboarding@resend.dev>',
      to: adminEmail,
      subject: '🍕 Test Email from Cantina',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email sent at: ${new Date().toISOString()}</p>
        <p>If you receive this, your email configuration is working!</p>
      `,
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('\n❌ Failed to send email:');
    console.error('Error:', error.message || error);

    if (error.statusCode === 403) {
      console.log('\n⚠️  This usually means:');
      console.log('   1. The recipient email is not your Resend account email');
      console.log(
        '   2. You need to verify a domain to send to other addresses',
      );
    }
  }
}

testEmail();
