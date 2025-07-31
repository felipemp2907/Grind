/**
 * Tests for streak preseed and deadline guard functionality
 */

import { buildStreakTemplate, calculateDaysToDeadline, isDateBeyondDeadlines, getActiveGoalsForDate } from '../utils/streakUtils';

describe('Streak Preseed and Deadline Guard', () => {
  const mockGoals = [
    {
      id: 'goal1',
      title: 'Learn React Native',
      description: 'Master React Native development',
      deadline: '2024-08-30',
      status: 'active',
      milestones: [],
      createdAt: '2024-07-01',
      updatedAt: '2024-07-01',
      progressValue: 0,
      targetValue: 100,
      xpEarned: 0,
      streakCount: 0,
      todayTasksIds: [],
      streakTaskIds: []
    },
    {
      id: 'goal2',
      title: 'Get fit',
      description: 'Improve physical fitness and health',
      deadline: '2024-09-15',
      status: 'active',
      milestones: [],
      createdAt: '2024-07-01',
      updatedAt: '2024-07-01',
      progressValue: 0,
      targetValue: 100,
      xpEarned: 0,
      streakCount: 0,
      todayTasksIds: [],
      streakTaskIds: []
    }
  ];

  describe('buildStreakTemplate', () => {
    test('should create default streak template', () => {
      const template = buildStreakTemplate(mockGoals[0]);
      
      expect(template).toHaveLength(3);
      expect(template[0]).toHaveProperty('title');
      expect(template[0]).toHaveProperty('description');
      expect(template[0]).toHaveProperty('xpValue');
      expect(template[0]).toHaveProperty('priority');
    });

    test('should create fitness-specific template', () => {
      const template = buildStreakTemplate(mockGoals[1]);
      
      expect(template).toHaveLength(3);
      expect(template[0].title).toContain('workout');
      expect(template[1].title).toContain('nutrition');
      expect(template[2].title).toContain('Recovery');
    });
  });

  describe('calculateDaysToDeadline', () => {
    test('should calculate days correctly', () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 10);
      
      const days = calculateDaysToDeadline(futureDate.toISOString());
      expect(days).toBe(11); // +1 to include today
    });

    test('should return 0 for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const days = calculateDaysToDeadline(pastDate.toISOString());
      expect(days).toBe(0);
    });
  });

  describe('isDateBeyondDeadlines', () => {
    test('should return false for date within goal deadlines', () => {
      const result = isDateBeyondDeadlines('2024-08-15', mockGoals);
      expect(result).toBe(false);
    });

    test('should return true for date beyond all deadlines', () => {
      const result = isDateBeyondDeadlines('2024-10-01', mockGoals);
      expect(result).toBe(true);
    });

    test('should return true for empty goals array', () => {
      const result = isDateBeyondDeadlines('2024-08-15', []);
      expect(result).toBe(true);
    });
  });

  describe('getActiveGoalsForDate', () => {
    test('should return goals that cover the date', () => {
      const activeGoals = getActiveGoalsForDate('2024-08-15', mockGoals);
      expect(activeGoals).toHaveLength(2);
    });

    test('should return only goals that cover the date', () => {
      const activeGoals = getActiveGoalsForDate('2024-09-01', mockGoals);
      expect(activeGoals).toHaveLength(1);
      expect(activeGoals[0].id).toBe('goal2');
    });

    test('should return empty array for date beyond all deadlines', () => {
      const activeGoals = getActiveGoalsForDate('2024-10-01', mockGoals);
      expect(activeGoals).toHaveLength(0);
    });
  });
});