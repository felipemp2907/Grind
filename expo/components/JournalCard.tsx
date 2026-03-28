import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, FileText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { JournalEntry } from '@/types';
import { formatDateForDisplay } from '@/utils/dateUtils';

type JournalCardProps = {
  entry: JournalEntry;
  isTaskValidation?: boolean;
};

export default function JournalCard({ entry, isTaskValidation = false }: JournalCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/journal/${entry.id}`);
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
          {isTaskValidation && (
            <View style={styles.validationBadge}>
              <Text style={styles.validationText}>Task Proof</Text>
            </View>
          )}
        </View>
        <View style={styles.dateRow}>
          <Calendar size={14} color={Colors.dark.subtext} />
          <Text style={styles.dateText}>{formatDateForDisplay(entry.date)}</Text>
        </View>
      </View>
      
      {entry.mediaUri && (
        <View style={styles.mediaContainer}>
          <Image 
            source={{ uri: entry.mediaUri }} 
            style={styles.media}
            resizeMode="cover"
          />
        </View>
      )}
      
      <View style={styles.contentPreview}>
        <FileText size={16} color={Colors.dark.subtext} style={styles.contentIcon} />
        <Text style={styles.contentText} numberOfLines={2}>
          {entry.content}
        </Text>
      </View>
      
      {entry.reflection && (
        <View style={styles.reflectionContainer}>
          <Text style={styles.reflectionLabel}>Reflection:</Text>
          <Text style={styles.reflectionText} numberOfLines={1}>
            {entry.reflection}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Colors.common.shadow,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  mediaContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  contentPreview: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contentIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  contentText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    flex: 1,
  },
  validationBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  reflectionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  reflectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  reflectionText: {
    fontSize: 13,
    color: Colors.dark.subtext,
    fontStyle: 'italic',
  },
});