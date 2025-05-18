// Prisma no longer used - keeping this file as a stub 
// to avoid breaking imports in case there are still references
// This app now uses localStorage for data storage

import { PrismaClient, Prisma } from '@prisma/client'

// For better debugging - use proper log level types
const logLevel = process.env.NODE_ENV === 'development' 
  ? ['query', 'info', 'warn', 'error'] as Prisma.LogLevel[]
  : ['error'] as Prisma.LogLevel[];

// Log the database URL (but hide credentials)
const dbUrl = process.env.DATABASE_URL || '';
console.log(`Database URL: ${dbUrl.replace(/\/\/.*@/, '//****:****@')}`);

// Create Prisma client with connection debugging
const prismaClientOptions = {
  log: logLevel,
  errorFormat: 'pretty' as const,
};

// Use global prisma instance to prevent too many clients in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaClientOptions);

// Test the database connection on startup
async function testConnection() {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Test that the Chart table exists by running a simple query
    try {
      await prisma.chart.count();
      console.log('✅ Chart table exists and is accessible');
    } catch (error) {
      console.warn('⚠️ Chart table may not be ready:', error);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Run the test immediately
testConnection();

// For Next.js hot reloading in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma