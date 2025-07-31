import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Target,
  Flame,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useJournalStore } from '@/store/journalStore';
import { 
  getTodayDate, 
  formatDateForDisplay, 
  formatDate,
  isPastDate
} from '@/utils/dateUtils';
import TaskCard from '@/components/TaskCard';
import Button from '@/components/Button';
import CreateTaskModal from '@/components/CreateTaskModal';


export default function TasksScreen() {
  const router = useRouter();
  const { goals, activeGoalId, setActiveGoal } = useGoalStore();
  const { tasks, getTasks, getTasksByGoal, generateDailyTasks, generateTasksForGoal, isGenerating, generateAISuggestions, canAddMoreTasks } = useTaskStore();
  const { entries } = useJournalStore();
  
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [refreshing, setRefreshing] = useState(false);
  const [filterByGoal, setFilterByGoal] = useState<string | null>(null);
  const [filterByType, setFilterByType] = useState<'all' | 'habits' | 'tasks'>('all');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Get filtered tasks
  let selectedTasks = filterByGoal 
    ? getTasksByGoal(selectedDate, filterByGoal)
    : getTasks(selectedDate);
    
  // Apply type filter
  if (filterByType === 'habits') {
    selectedTasks = selectedTasks.filter(task => task.isHabit);
  } else if (filterByType === 'tasks') {
    selectedTasks = selectedTasks.filter(task => !task.isHabit);
  }
  
  const completedTasks = selectedTasks.filter(task => task.completed);
  const incompleteTasks = selectedTasks.filter(task => !task.completed);
  
  // Get journal entries for tasks
  const getJournalEntryForTask = (taskId: string) => {
    return entries.find(entry => entry.taskId === taskId);
  };
  
  useEffect(() => {
    // Only generate tasks automatically for today, not when switching dates
    if (selectedTasks.length === 0 && selectedDate === getTodayDate() && goals.length > 0) {
      generateDailyTasks(selectedDate);
    }
  }, [goals.length]); // Removed selectedDate from dependencies to prevent auto-generation when switching dates
  
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await generateDailyTasks(selectedDate);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(formatDate(currentDate));
  };
  
  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(formatDate(currentDate));
  };
  
  const goToToday = () => {
    setSelectedDate(getTodayDate());
  };
  
  const handleAddTask = () => {
    setShowCreateTaskModal(true);
  };
  
  const toggleGoalFilter = (goalId: string) => {
    if (filterByGoal === goalId) {
      setFilterByGoal(null);
    } else {
      setFilterByGoal(goalId);
    }
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={48} color={Colors.dark.inactive} />
      <Text style={styles.emptyStateTitle}>No Tasks</Text>
      <Text style={styles.emptyStateDescription}>
        {isPastDate(selectedDate) 
          ? "You don't have any tasks for this day."
          : "Add tasks to make progress toward your goal."}
      </Text>
      {!isPastDate(selectedDate) && goals.length > 0 && (
        <Button 
          title={isGenerating ? "Generating..." : "Generate Tasks"}
          onPress={() => generateDailyTasks(selectedDate)}
          style={styles.emptyStateButton}
          size="small"
          loading={isGenerating}
          disabled={isGenerating}
        />
      )}
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={goToPreviousDay}
        >
          <ChevronLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dateDisplay}
          onPress={goToToday}
        >
          <Text style={styles.dateText}>{formatDateForDisplay(selectedDate)}</Text>
          {selectedDate !== getTodayDate() && (
            <Text style={styles.todayText}>Tap to go to today</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={goToNextDay}
        >
          <ChevronRight size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>
      
      {goals.length > 0 && (
        <View style={styles.goalFilters}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalFiltersContent}
          >
            <TouchableOpacity 
              style={[
                styles.goalFilterButton,
                filterByGoal === null && styles.activeGoalFilter
              ]}
              onPress={() => setFilterByGoal(null)}
            >
              <Text 
                style={[
                  styles.goalFilterText,
                  filterByGoal === null && styles.activeGoalFilterText
                ]}
              >
                All Goals
              </Text>
            </TouchableOpacity>
            
            {goals.map(goal => (
              <TouchableOpacity 
                key={goal.id}
                style={[
                  styles.goalFilterButton,
                  filterByGoal === goal.id && styles.activeGoalFilter
                ]}
                onPress={() => toggleGoalFilter(goal.id)}
              >
                <Target size={14} color={filterByGoal === goal.id ? Colors.dark.primary : Colors.dark.subtext} />
                <Text 
                  style={[
                    styles.goalFilterText,
                    filterByGoal === goal.id && styles.activeGoalFilterText
                  ]}
                >
                  {goal.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.typeFilters}>
        <TouchableOpacity 
          style={[
            styles.typeFilterButton,
            filterByType === 'all' && styles.activeTypeFilter
          ]}
          onPress={() => setFilterByType('all')}
        >
          <Text 
            style={[
              styles.typeFilterText,
              filterByType === 'all' && styles.activeTypeFilterText
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.typeFilterButton,
            filterByType === 'tasks' && styles.activeTypeFilter
          ]}
          onPress={() => setFilterByType('tasks')}
        >
          <Text 
            style={[
              styles.typeFilterText,
              filterByType === 'tasks' && styles.activeTypeFilterText
            ]}
          >
            Today Tasks
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.typeFilterButton,
            filterByType === 'habits' && styles.activeTypeFilter
          ]}
          onPress={() => setFilterByType('habits')}
        >
          <Flame size={14} color={filterByType === 'habits' ? Colors.dark.warning : Colors.dark.subtext} />
          <Text 
            style={[
              styles.typeFilterText,
              filterByType === 'habits' && styles.activeHabitFilterText
            ]}
          >
            Streak Tasks
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {completedTasks.length}/{selectedTasks.length} Tasks Completed
        </Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => router.push('/calendar')}
          >
            <Calendar size={20} color={Colors.dark.text} />
          </TouchableOpacity>
          
          {!isPastDate(selectedDate) && goals.length > 0 && (
            <TouchableOpacity 
              style={styles.aiSuggestButton}
              onPress={async () => {
                const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];
                if (activeGoal) {
                  const taskLimits = canAddMoreTasks(selectedDate, filterByGoal || activeGoal.id);
                  if (taskLimits.canAddToday || taskLimits.canAddHabits) {
                    await generateAISuggestions(selectedDate, filterByGoal || activeGoal.id);
                  }
                }
              }}
              disabled={isGenerating}
            >
              <Zap size={18} color={Colors.dark.secondary} />
            </TouchableOpacity>
          )}
          
          {!isPastDate(selectedDate) && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTask}
            >
              <Plus size={20} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {isGenerating && selectedTasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Hustle is generating high-quality tasks...</Text>
        </View>
      ) : selectedTasks.length > 0 ? (
        <FlatList
          data={[...incompleteTasks, ...completedTasks]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard 
              task={item} 
              journalEntry={getJournalEntryForTask(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing || isGenerating} 
              onRefresh={onRefresh}
              tintColor={Colors.dark.primary}
            />
          }
        />
      ) : (
        renderEmptyState()
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        date={selectedDate}
        goalId={filterByGoal || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  dateButton: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  todayText: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginTop: 2,
  },
  goalFilters: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  goalFiltersContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  activeGoalFilter: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
  },
  goalFilterText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  activeGoalFilterText: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  typeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    flex: 1,
    justifyContent: 'center',
  },
  activeTypeFilter: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
  },
  typeFilterText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  activeTypeFilterText: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  activeHabitFilterText: {
    color: Colors.dark.warning,
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarButton: {
    backgroundColor: Colors.dark.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiSuggestButton: {
    backgroundColor: 'rgba(0, 206, 201, 0.15)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 150,
  }
});