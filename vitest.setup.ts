import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Prisma Client
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      note: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findUnique: vi.fn(),
        createMany: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      tag: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    })),
    NoteStatus: {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      ARCHIVED: 'ARCHIVED',
    },
    Prisma: {
      ...actual.Prisma,
    },
  };
});

// Mock crypto module with proper default export
vi.mock('crypto', () => {
  const mockCreateHash = vi.fn((algorithm) => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn((encoding) => {
      if (encoding === 'hex') {
        if (algorithm === 'sha256') {
          return 'a'.repeat(64); // 64 character SHA-256 hash
        } else if (algorithm === 'md5') {
          return 'b'.repeat(32); // 32 character MD5 hash
        }
        return 'c'.repeat(40); // Default 40 character hash
      }
      return Buffer.from('mock-hash');
    }),
  }));

  return {
    default: {
      randomUUID: vi.fn(() => 'mock-uuid-1234-5678'),
      createHash: mockCreateHash,
      // Add other crypto methods if needed
      randomBytes: vi.fn(() => Buffer.from('mock-bytes')),
    },
    randomUUID: vi.fn(() => 'mock-uuid-1234-5678'),
    createHash: mockCreateHash,
    // Add other crypto methods if needed
    randomBytes: vi.fn(() => Buffer.from('mock-bytes')),
  };
});

// Setup global test utilities
global.console = {
  ...console,
  // Uncomment to ignore specific console logs during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
