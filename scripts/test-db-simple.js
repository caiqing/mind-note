const { PrismaClient } = require('@prisma/client');

// Set database URL directly
const DATABASE_URL =
  'postgresql://mindnote:dev_password@localhost:5432/mindnote_dev';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

async function testDbConnection() {
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');

    // Test simple query
    const result =
      await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    console.log('✅ Database query test passed:', result);

    // Test table access
    const userCount = await prisma.user.count();
    console.log(`👥 User count: ${userCount}`);

    console.log('🎉 Database setup is complete and working!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDbConnection();
