// Quick test script to check signup functionality
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testSignup() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');

    console.log('\nTesting bcrypt...');
    const hash = await bcrypt.hash('test123', 12);
    console.log('✅ Bcrypt works, hash:', hash.substring(0, 20) + '...');

    console.log('\nTesting user creation...');
    const testEmail = `test${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hash,
        name: 'Test User',
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    console.log('✅ User created:', user);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test user deleted');

    await prisma.$disconnect();
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testSignup();
