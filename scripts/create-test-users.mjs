import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwunbphjkkqnzwqrxfwi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dW5icGhqa2txbnp3cXJ4ZndpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM3NzkyOSwiZXhwIjoyMDc5OTUzOTI5fQ.BYjVv2BDWZdX53tV6DxzqACoy7UzwLbR5fNEHqVCiKk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: 'admin@primebridge.finance',
    password: 'TestAdmin123!',
    role: 'admin',
    name: 'Platform Admin',
  },
  {
    email: 'demo-lender@example.com',
    password: 'TestLender123!',
    role: 'lender',
    name: 'Demo Lender',
    lenderProfile: {
      company_name: 'Demo Fintech Inc.',
      legal_entity_name: 'Demo Fintech Inc.',
      primary_contact_name: 'Demo Lender',
      primary_contact_email: 'demo-lender@example.com',
      loan_types: ['consumer', 'auto'],
      status: 'approved',
    },
  },
  {
    email: 'demo-investor@example.com',
    password: 'TestInvestor123!',
    role: 'investor',
    name: 'Demo Investor',
    investorProfile: {
      investor_type: 'individual',
      firm_name: 'Demo Capital',
      min_check_size: 25000,
      max_check_size: 500000,
      accreditation_status: 'verified',
      kyc_status: 'passed',
      approved: true,
    },
  },
];

async function createTestUsers() {
  console.log('Creating test users...\n');

  for (const user of testUsers) {
    console.log(`Creating ${user.role}: ${user.email}`);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`  Auth user already exists, fetching...`);
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find((u) => u.email === user.email);
          if (existingUser) {
            authData.user = existingUser;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      const authUserId = authData?.user?.id;
      console.log(`  Auth user ID: ${authUserId}`);

      // 2. Check if user exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      let userId;

      if (existingUser) {
        console.log(`  User already in users table, updating...`);
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ auth_user_id: authUserId, role: user.role, name: user.name })
          .eq('email', user.email)
          .select()
          .single();

        if (updateError) throw updateError;
        userId = updatedUser.id;
      } else {
        // Insert into users table
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUserId,
            role: user.role,
            name: user.name,
            email: user.email,
          })
          .select()
          .single();

        if (userError) throw userError;
        userId = newUser.id;
      }

      console.log(`  User ID: ${userId}`);

      // 3. Create role-specific profile
      if (user.role === 'lender' && user.lenderProfile) {
        const { data: existingLender } = await supabase
          .from('lenders')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!existingLender) {
          const { error: lenderError } = await supabase.from('lenders').insert({
            user_id: userId,
            ...user.lenderProfile,
            approved_at: new Date().toISOString(),
          });

          if (lenderError) throw lenderError;
          console.log(`  Lender profile created`);
        } else {
          console.log(`  Lender profile already exists`);
        }
      }

      if (user.role === 'investor' && user.investorProfile) {
        const { data: existingInvestor } = await supabase
          .from('investors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!existingInvestor) {
          const { error: investorError } = await supabase.from('investors').insert({
            user_id: userId,
            ...user.investorProfile,
            approved_at: new Date().toISOString(),
            accreditation_verified_at: new Date().toISOString(),
            kyc_completed_at: new Date().toISOString(),
          });

          if (investorError) throw investorError;
          console.log(`  Investor profile created`);
        } else {
          console.log(`  Investor profile already exists`);
        }
      }

      console.log(`  Done!\n`);
    } catch (error) {
      console.error(`  Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(50));
  console.log('Test Accounts Created:');
  console.log('='.repeat(50));
  for (const user of testUsers) {
    console.log(`${user.role.toUpperCase()}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  }
}

createTestUsers();
