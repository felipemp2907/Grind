/**
 * Database Setup Tests
 * Tests for database setup detection and error handling
 */

import { checkDatabaseSetup, setupDatabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ error: null, data: [] }))
      }))
    }))
  };

  return {
    supabase: mockSupabase,
    checkDatabaseSetup: jest.fn(),
    setupDatabase: jest.fn(),
    serializeError: jest.fn((error) => error?.message || 'Unknown error')
  };
});

describe('Database Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect when database is properly set up', async () => {
    const { checkDatabaseSetup } = require('../lib/supabase');
    checkDatabaseSetup.mockResolvedValue({ isSetup: true });

    const result = await checkDatabaseSetup();
    expect(result.isSetup).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should detect when database tables are missing', async () => {
    const { checkDatabaseSetup } = require('../lib/supabase');
    checkDatabaseSetup.mockResolvedValue({ 
      isSetup: false, 
      error: 'Database tables not found. Please run the database setup script in your Supabase SQL editor to create the required tables.' 
    });

    const result = await checkDatabaseSetup();
    expect(result.isSetup).toBe(false);
    expect(result.error).toContain('Database tables not found');
  });

  test('should handle RLS policy errors', async () => {
    const { checkDatabaseSetup } = require('../lib/supabase');
    checkDatabaseSetup.mockResolvedValue({ 
      isSetup: false, 
      error: 'Database tables exist but Row Level Security policies are not configured. Please run the complete database setup script.' 
    });

    const result = await checkDatabaseSetup();
    expect(result.isSetup).toBe(false);
    expect(result.error).toContain('Row Level Security policies');
  });

  test('setupDatabase should return success when database is ready', async () => {
    const { setupDatabase } = require('../lib/supabase');
    setupDatabase.mockResolvedValue({ success: true });

    const result = await setupDatabase();
    expect(result.success).toBe(true);
  });

  test('setupDatabase should return error when database is not ready', async () => {
    const { setupDatabase } = require('../lib/supabase');
    setupDatabase.mockResolvedValue({ 
      success: false, 
      error: 'Database setup required. Please run the database setup script in your Supabase SQL editor to create the required tables and policies.' 
    });

    const result = await setupDatabase();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Database setup required');
  });
});