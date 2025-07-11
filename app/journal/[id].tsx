import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  Calendar, 
  Edit2, 
  Save, 
  Trash2,
  CheckCircle2
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useJournalStore } from '@/store/journalStore';
import { useTaskStore } from '@/store/taskStore';
import { formatDateForDisplay } from '@/utils/dateUtils';
import Button from '@/components/Button';

export default function JournalEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { getEntryById, updateEntry, deleteEntry } = useJournalStore();
  const { getTaskById } = useTaskStore();
  
  const [entry, setEntry] = useState(getEntryById(id));
  const [task, setTask] = useState(entry?.taskId ? getTaskById(entry.taskId) : undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [reflection, setReflection] = useState(entry?.reflection || '');
  
  useEffect(() => {
    if (!entry) {
      // Entry not found, go back
      router.back();
    }
  }, [entry, router]);
  
  const handleSave = () => {
    if (!entry) return;
    
    updateEntry(entry.id, {
      title,
      content,
      reflection
    });
    
    // Update local state
    setEntry({
      ...entry,
      title,
      content,
      reflection
    });
    
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    if (!entry) return;
    
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this journal entry?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteEntry(entry.id);
            router.back();
          }
        }
      ]
    );
  };
  
  if (!entry) {
    return null;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: isEditing ? "Edit Entry" : "Journal Entry",
          headerRight: () => (
            <TouchableOpacity
              onPress={isEditing ? handleSave : () => setIsEditing(true)}
              style={styles.headerButton}
            >
              {isEditing ? (
                <Save size={20} color={Colors.dark.text} />
              ) : (
                <Edit2 size={20} color={Colors.dark.text} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Entry Title"
              placeholderTextColor={Colors.dark.subtext}
            />
          ) : (
            <Text style={styles.title}>{entry.title}</Text>
          )}
          
          <View style={styles.dateRow}>
            <Calendar size={16} color={Colors.dark.subtext} />
            <Text style={styles.date}>{formatDateForDisplay(entry.date)}</Text>
          </View>
          
          {task && (
            <View style={styles.taskBadge}>
              <CheckCircle2 size={16} color={Colors.dark.success} />
              <Text style={styles.taskText}>Task Validation</Text>
            </View>
          )}
          
          {entry.mediaUri && (
            <Image 
              source={{ uri: entry.mediaUri }} 
              style={styles.media}
              resizeMode="cover"
            />
          )}
          
          {isEditing ? (
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Write your journal entry..."
              placeholderTextColor={Colors.dark.subtext}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.content}>{entry.content}</Text>
          )}
          
          {(entry.reflection || isEditing) && (
            <View style={styles.reflectionContainer}>
              <Text style={styles.reflectionTitle}>Reflection</Text>
              {isEditing ? (
                <TextInput
                  style={styles.reflectionInput}
                  value={reflection}
                  onChangeText={setReflection}
                  placeholder="Add your reflection..."
                  placeholderTextColor={Colors.dark.subtext}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.reflectionText}>{entry.reflection}</Text>
              )}
            </View>
          )}
          
          {isEditing && (
            <View style={styles.buttonContainer}>
              <Button
                title="Save Changes"
                onPress={handleSave}
                icon={<Save size={16} color={Colors.dark.text} />}
                style={styles.saveButton}
              />
              <Button
                title="Delete Entry"
                onPress={handleDelete}
                variant="danger"
                icon={<Trash2 size={16} color={Colors.dark.text} />}
                style={styles.deleteButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginLeft: 6,
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  taskText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.success,
    marginLeft: 4,
  },
  media: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  contentInput: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 24,
    marginBottom: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
  },
  reflectionContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  reflectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  reflectionInput: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 24,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: Colors.dark.danger,
  },
});