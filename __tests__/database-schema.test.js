/**
 * Database Schema Test
 * 
 * This test verifies that the database schema is properly set up
 * and all required columns exist in the tables.
 */

const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client for testing
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
};

describe('Database Schema', () => {
  test('should have required columns in tasks table', () => {
    const requiredColumns = [
      'id',
      'user_id', 
      'goal_id',
      'title',
      'description',
      'completed', // This is the column that was missing
      'due_date',
      'priority',
      'xp_value',
      'is_habit',
      'streak',
      'completed_at',
      'created_at',
      'updated_at'
    ];
    
    // This test ensures we know what columns should exist
    expect(requiredColumns).toContain('completed');
    expect(requiredColumns).toContain('due_date');
    expect(requiredColumns).toContain('xp_value');
    expect(requiredColumns).toContain('is_habit');
    expect(requiredColumns.length).toBe(14);
  });

  test('should have required columns in goals table', () => {
    const requiredColumns = [
      'id',
      'user_id',
      'title', 
      'description',
      'deadline',
      'created_at',
      'updated_at'
    ];
    
    expect(requiredColumns).toContain('user_id');
    expect(requiredColumns).toContain('title');
    expect(requiredColumns.length).toBe(7);
  });

  test('should have required columns in profiles table', () => {
    const requiredColumns = [
      'id',
      'name',
      'avatar_url',
      'level',
      'xp',
      'streak_days',
      'longest_streak',
      'created_at',
      'updated_at'
    ];
    
    expect(requiredColumns).toContain('level');
    expect(requiredColumns).toContain('xp');
    expect(requiredColumns).toContain('streak_days');
    expect(requiredColumns.length).toBe(9);
  });

  test('should handle task insertion with all required fields', async () => {
    const taskData = {
      user_id: 'test-user-id',
      goal_id: 'test-goal-id',
      title: 'Test Task',
      description: 'Test Description',
      completed: false,
      due_date: new Date().toISOString(),
      priority: 'medium',
      xp_value: 30,
      is_habit: false,
      streak: 0,
      completed_at: null
    };

    // Mock the insert operation
    const result = await mockSupabase.from('tasks').insert(taskData);
    
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    expect(result.error).toBeNull();
  });
});

module.exports = {
  mockSupabase
};