import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Target,
  Flame,
  Plus as PlusIcon
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { RF, SP, HP, responsivePadding, responsiveMargin } from '@/utils/responsive';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { formatDate, getTodayDate } from '@/utils/dateUtils';
import { Task } from '@/types';
import CreateTaskModal from '@/components/CreateTaskModal';

// Helper function to get days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the day of week (0-6) for the first day of the month
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Helper function to get month name
const getMonthName = (month: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

// Type for goal deadline
interface GoalDeadline {
  id: string;
  title: string;
  date: string;
  day: number;
  month: number;
  year: number;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { goals } = useGoalStore();
  const { tasks, generateTasksForGoal, isGenerating } = useTaskStore();
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Get days in current month
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Get tasks for selected date (memoized for performance)
  const selectedTasks = useMemo(() => 
    tasks.filter(task => task.date === selectedDate), 
    [tasks, selectedDate]
  );
  const habitTasks = useMemo(() => 
    selectedTasks.filter(task => task.isHabit), 
    [selectedTasks]
  );
  const regularTasks = useMemo(() => 
    selectedTasks.filter(task => !task.isHabit), 
    [selectedTasks]
  );
  
  // Get goal deadlines in this month (memoized for performance)
  const goalDeadlines = useMemo(() => {
    return goals.filter(goal => goal.deadline).map(goal => {
      // Parse the deadline date properly
      const deadlineDate = new Date(goal.deadline);
      // Ensure we're working with local date, not UTC
      const localDeadlineDate = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
      
      return {
        id: goal.id,
        title: goal.title,
        date: formatDate(localDeadlineDate),
        day: localDeadlineDate.getDate(),
        month: localDeadlineDate.getMonth(),
        year: localDeadlineDate.getFullYear()
      };
    }).filter(deadline => 
      deadline.month === currentMonth && deadline.year === currentYear
    );
  }, [goals, currentMonth, currentYear]);
  
  // Check if a day has tasks (memoized for performance)
  const dayHasTasks = useCallback((day: number) => {
    const dateString = formatDate(new Date(currentYear, currentMonth, day));
    return tasks.some(task => task.date === dateString);
  }, [tasks, currentYear, currentMonth]);
  
  // Check if a day has a habit task (memoized for performance)
  const dayHasHabit = useCallback((day: number) => {
    const dateString = formatDate(new Date(currentYear, currentMonth, day));
    return tasks.some(task => task.date === dateString && task.isHabit);
  }, [tasks, currentYear, currentMonth]);
  
  // Check if a day has a goal deadline (memoized for performance)
  const dayHasDeadline = useCallback((day: number) => {
    return goalDeadlines.some(deadline => deadline.day === day);
  }, [goalDeadlines]);
  
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const handleDayPress = useCallback((day: number) => {
    const dateString = formatDate(new Date(currentYear, currentMonth, day));
    setSelectedDate(dateString);
  }, [currentYear, currentMonth]);
  
  const handleAddTask = useCallback(() => {
    setShowCreateTaskModal(true);
  }, []);
  
  const handleGenerateTasks = useCallback(async () => {
    // Find goals that don't have tasks for this date
    const goalsWithoutTasks = goals.filter(goal => {
      return !tasks.some(task => 
        task.date === selectedDate && task.goalId === goal.id
      );
    });
    
    // Generate tasks for each goal
    for (const goal of goalsWithoutTasks) {
      await generateTasksForGoal(selectedDate, goal.id);
    }
  }, [goals, tasks, selectedDate, generateTasksForGoal]);
  
  const renderCalendarDay = (day: number) => {
    const dateString = formatDate(new Date(currentYear, currentMonth, day));
    const isToday = dateString === getTodayDate();
    const isSelected = dateString === selectedDate;
    const hasTask = dayHasTasks(day);
    const hasHabit = dayHasHabit(day);
    const hasDeadline = dayHasDeadline(day);
    
    return (
      <TouchableOpacity
        key={`day-${day}`}
        style={styles.calendarDay}
        onPress={() => handleDayPress(day)}
      >
        <View style={styles.dayContainer}>
          {/* Indicators positioned above the day number */}
          <View style={styles.indicatorContainer}>
            {hasTask && !hasHabit && <View style={styles.taskIndicator} />}
            {hasHabit && <View style={styles.habitIndicator} />}
            {hasDeadline && <View style={styles.deadlineIndicator} />}
          </View>
          
          {/* Day number with conditional styling */}
          <View style={[
            isSelected && styles.selectedDayCircle
          ]}>
            <Text 
              style={[
                styles.calendarDayText,
                isToday && styles.todayText,
                isSelected && styles.selectedDayText
              ]}
            >
              {day}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderTaskItem = (task: Task) => {
    const goal = goals.find(g => g.id === task.goalId);
    
    return (
      <TouchableOpacity 
        key={task.id}
        style={[
          styles.taskItem,
          task.isHabit && styles.habitTaskItem
        ]}
        onPress={() => {
          if (task.completed) {
            router.push(`/journal/${task.journalEntryId}`);
          } else {
            router.push({
              pathname: '/validate-task',
              params: { taskId: task.id }
            });
          }
        }}
      >
        <View style={styles.taskTime}>
          {task.isHabit ? (
            <Flame size={14} color={Colors.dark.warning} />
          ) : (
            <Clock size={14} color={Colors.dark.subtext} />
          )}
          <Text style={[
            styles.taskTimeText,
            task.isHabit && styles.habitTimeText
          ]}>
            {task.isHabit ? `Streak: ${task.streak}` : (task.scheduledTime || "Today")}
          </Text>
        </View>
        
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          
          {goal && (
            <View style={styles.taskGoal}>
              <Target size={12} color={Colors.dark.primary} />
              <Text style={styles.taskGoalText}>{goal.title}</Text>
            </View>
          )}
          
          {task.completed && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderDeadlineItem = (deadline: GoalDeadline) => {
    return (
      <View style={styles.deadlineItem} key={deadline.id}>
        <View style={styles.deadlineIcon}>
          <Target size={16} color={Colors.dark.danger} />
        </View>
        
        <View style={styles.deadlineContent}>
          <Text style={styles.deadlineTitle}>DEADLINE: {deadline.title}</Text>
          <Text style={styles.deadlineDate}>
            Goal deadline on {new Date(deadline.date).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };
  
  // Get deadlines for selected date (memoized for performance)
  const selectedDateDeadlines = useMemo(() => 
    goalDeadlines.filter(deadline => deadline.date === selectedDate),
    [goalDeadlines, selectedDate]
  );
  
  // Debug logs for deadline functionality
  if (goalDeadlines.length > 0) {
    console.log('Goal deadlines in current month:', goalDeadlines);
    console.log('Selected date:', selectedDate);
    console.log('Selected date deadlines:', selectedDateDeadlines);
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.calendarContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={goToPreviousMonth}
          >
            <ChevronLeft size={RF(20)} color="#000000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={goToNextMonth}
          >
            <ChevronRight size={RF(20)} color="#000000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekdaysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {/* Empty cells for days before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.emptyDay} />
          ))}
          
          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => 
            renderCalendarDay(index + 1)
          )}
        </View>
      </View>
      
      <View style={styles.selectedDateHeader}>
        <View style={styles.selectedDateIcon}>
          <CalendarIcon size={20} color={Colors.dark.primary} />
        </View>
        <Text style={styles.selectedDateText}>
          {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
        <TouchableOpacity 
          style={styles.addEventButton}
          onPress={handleAddTask}
        >
          <PlusIcon size={20} color="#000000" />
        </TouchableOpacity>
      </View>
      
      {isGenerating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Hustle is generating tasks...</Text>
        </View>
      ) : selectedTasks.length === 0 && selectedDateDeadlines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No events for this day</Text>
          <View style={styles.emptyStateButtons}>
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={handleAddTask}
            >
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>
            
            {goals.length > 0 && selectedDate >= getTodayDate() && (
              <TouchableOpacity 
                style={styles.generateTasksButton}
                onPress={handleGenerateTasks}
              >
                <Text style={styles.generateTasksText}>Generate AI Tasks</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <ScrollView style={styles.eventsContainer}>
          {/* Deadlines */}
          {selectedDateDeadlines.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Goal Deadlines</Text>
              {selectedDateDeadlines.map(deadline => renderDeadlineItem(deadline))}
            </>
          )}
          
          {/* Habit Tasks */}
          {habitTasks.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Streak Tasks</Text>
              {habitTasks.map(task => renderTaskItem(task))}
            </>
          )}
          
          {/* Regular Tasks */}
          {regularTasks.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Today Tasks</Text>
              {regularTasks.map(task => renderTaskItem(task))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        date={selectedDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  calendarContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    margin: 12,
    marginBottom: 0,
    overflow: 'hidden',
    ...Colors.common.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsivePadding.md,
    paddingVertical: HP(1.5),
    backgroundColor: Colors.dark.primary,
    minHeight: HP(8),
  },
  headerButton: {
    padding: responsivePadding.sm,
    borderRadius: SP(5),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: SP(10),
    minHeight: SP(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  weekdaysHeader: {
    flexDirection: 'row',
    paddingVertical: responsivePadding.sm,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontWeight: '600',
    color: Colors.dark.subtext,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: responsivePadding.xs,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: SP(0.5),
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    ...typography.bodySmall,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  today: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderRadius: 20,
  },
  todayText: {
    color: Colors.dark.primary,
    fontWeight: 'bold',
  },
  selectedDayCircle: {
    backgroundColor: '#FFFFFF',
    width: SP(8),
    height: SP(8),
    borderRadius: SP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SP(0.5),
    height: SP(1),
    gap: SP(0.75),
  },
  taskIndicator: {
    width: SP(1),
    height: SP(1),
    borderRadius: SP(0.5),
    backgroundColor: Colors.dark.primary,
  },
  habitIndicator: {
    width: SP(1),
    height: SP(1),
    borderRadius: SP(0.5),
    backgroundColor: Colors.dark.warning,
  },
  deadlineIndicator: {
    width: SP(1),
    height: SP(1),
    borderRadius: SP(0.5),
    backgroundColor: Colors.dark.danger,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsivePadding.md,
    paddingVertical: responsivePadding.sm,
    backgroundColor: Colors.dark.card,
    marginHorizontal: responsiveMargin.sm,
    marginTop: responsiveMargin.sm,
    borderRadius: SP(3),
    ...Colors.common.shadow,
  },
  selectedDateIcon: {
    marginRight: responsiveMargin.xs,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    padding: responsivePadding.xs,
    borderRadius: SP(5),
  },
  selectedDateText: {
    ...typography.body,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
  },
  addEventButton: {
    backgroundColor: Colors.dark.primary,
    width: SP(8),
    height: SP(8),
    borderRadius: SP(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsContainer: {
    flex: 1,
    padding: responsivePadding.md,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: responsiveMargin.xs,
    marginTop: responsiveMargin.xs,
  },
  taskItem: {
    backgroundColor: Colors.dark.card,
    borderRadius: SP(3),
    padding: responsivePadding.sm,
    marginBottom: responsiveMargin.sm,
    flexDirection: 'row',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
    ...Colors.common.shadow,
  },
  habitTaskItem: {
    borderLeftColor: Colors.dark.warning,
  },
  taskTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: responsiveMargin.sm,
    minWidth: SP(20),
  },
  taskTimeText: {
    ...typography.caption,
    color: Colors.dark.subtext,
    marginLeft: SP(1),
  },
  habitTimeText: {
    color: Colors.dark.warning,
    fontWeight: '600',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: SP(1),
  },
  taskGoal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskGoalText: {
    ...typography.caption,
    color: Colors.dark.primary,
    marginLeft: SP(1),
  },
  completedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    paddingVertical: SP(0.5),
    paddingHorizontal: SP(1.5),
    borderRadius: SP(2),
  },
  completedText: {
    fontSize: RF(10),
    fontWeight: '600',
    color: Colors.dark.success,
  },
  deadlineItem: {
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: SP(3),
    padding: responsivePadding.sm,
    marginBottom: responsiveMargin.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.danger,
    ...Colors.common.shadow,
  },
  deadlineIcon: {
    marginRight: responsiveMargin.sm,
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    padding: responsivePadding.xs,
    borderRadius: SP(5),
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    ...typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.dark.danger,
    marginBottom: SP(1),
  },
  deadlineDate: {
    ...typography.caption,
    color: Colors.dark.subtext,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: Colors.dark.subtext,
    marginTop: responsiveMargin.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: Colors.dark.subtext,
    marginBottom: responsiveMargin.md,
  },
  emptyStateButtons: {
    flexDirection: 'row',
    gap: responsiveMargin.sm,
  },
  addTaskButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: responsivePadding.sm,
    paddingHorizontal: responsivePadding.md,
    borderRadius: SP(2),
    ...Colors.common.shadow,
  },
  addTaskText: {
    ...typography.buttonSmall,
    color: '#000000',
  },
  generateTasksButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: responsivePadding.sm,
    paddingHorizontal: responsivePadding.md,
    borderRadius: SP(2),
    ...Colors.common.shadow,
  },
  generateTasksText: {
    ...typography.buttonSmall,
    color: Colors.dark.primary,
  }
});