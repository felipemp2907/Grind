import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle, 
  RefreshCw,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';

interface AgendaTask {
  title: string;
  description: string;
  xpValue: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

interface DailyAgenda {
  date: string;
  tasks: AgendaTask[];
  motivation: string;
  status: 'pending' | 'accepted' | 'regenerated';
  createdAt: string;
}

interface AgendaCardProps {
  agenda: DailyAgenda;
  onAccept: () => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
}

export default function AgendaCard({ 
  agenda, 
  onAccept, 
  onRegenerate, 
  isGenerating = false 
}: AgendaCardProps) {
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return Colors.dark.danger;
      case 'medium':
        return Colors.dark.warning;
      case 'low':
        return Colors.dark.success;
      default:
        return Colors.dark.subtext;
    }
  };
  
  const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'High Impact';
      case 'medium':
        return 'Medium Impact';
      case 'low':
        return 'Low Impact';
      default:
        return 'Impact';
    }
  };
  
  const totalXP = agenda.tasks.reduce((sum, task) => sum + task.xpValue, 0);
  const totalTime = agenda.tasks.reduce((sum, task) => {
    const time = parseInt(task.estimatedTime);
    return sum + (isNaN(time) ? 30 : time);
  }, 0);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={20} color={Colors.dark.primary} />
          <Text style={styles.title}>Today's AI-Generated Plan</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statBadge}>
            <Zap size={14} color={Colors.dark.primary} />
            <Text style={styles.statText}>{totalXP} XP</Text>
          </View>
          <View style={styles.statBadge}>
            <Clock size={14} color={Colors.dark.subtext} />
            <Text style={styles.statText}>{totalTime}m</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.motivation}>{agenda.motivation}</Text>
      
      <View style={styles.tasksContainer}>
        {agenda.tasks.map((task, index) => (
          <View key={index} style={styles.taskItem}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.taskMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}20` }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                    {getPriorityLabel(task.priority)}
                  </Text>
                </View>
                <Text style={styles.taskTime}>{task.estimatedTime}</Text>
              </View>
            </View>
            <Text style={styles.taskDescription}>{task.description}</Text>
            <View style={styles.taskFooter}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>+{task.xpValue} XP</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      
      {agenda.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="Regenerate Plan"
            onPress={onRegenerate}
            variant="outline"
            size="small"
            icon={<RefreshCw size={16} />}
            style={styles.actionButton}
            disabled={isGenerating}
            loading={isGenerating}
          />
          <Button
            title="Accept & Start"
            onPress={onAccept}
            size="small"
            icon={<CheckCircle size={16} />}
            style={styles.actionButton}
            disabled={isGenerating}
          />
        </View>
      )}
      
      {agenda.status === 'accepted' && (
        <View style={styles.acceptedBadge}>
          <CheckCircle size={16} color={Colors.dark.success} />
          <Text style={styles.acceptedText}>Plan Accepted - Tasks Added to Your Day</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
    ...Colors.common.shadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginLeft: 4,
  },
  motivation: {
    fontSize: 14,
    color: Colors.dark.text,
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  tasksContainer: {
    marginBottom: 16,
  },
  taskItem: {
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
    marginRight: 8,
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskTime: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  taskDescription: {
    fontSize: 13,
    color: Colors.dark.subtext,
    marginBottom: 8,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  xpBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  acceptedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.success,
    marginLeft: 6,
  },
});