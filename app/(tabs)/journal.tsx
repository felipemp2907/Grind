import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  TextInput,
  RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Plus, 
  Search, 
  Calendar,
  X
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useJournalStore } from '@/store/journalStore';
import JournalCard from '@/components/JournalCard';
import * as ImagePicker from 'expo-image-picker';
import { getTodayDate } from '@/utils/dateUtils';

export default function JournalScreen() {
  const router = useRouter();
  const { entries, addEntry, fetchEntries } = useJournalStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch entries when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('📖 Journal screen focused, fetching entries...');
      fetchEntries();
    }, [])
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 Refreshing journal entries...');
    await fetchEntries();
    setRefreshing(false);
  };
  
  // Filter entries based on search query
  const filteredEntries = searchQuery
    ? entries.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;
  
  // Sort entries by date (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const handleAddEntry = async () => {
    // Create a new journal entry
    const newEntry = {
      date: getTodayDate(),
      title: "New Journal Entry",
      content: "",
      createdAt: new Date().toISOString()
    };
    
    // Add entry and get the UUID from database
    const entryWithId = await addEntry(newEntry);
    
    // Navigate to the new entry if we got an ID back
    if (entryWithId?.id) {
      router.push(`/journal/${entryWithId.id}`);
    }
  };
  
  const handleAddPhotoEntry = async () => {
    // Request permission to access the camera roll
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }
    
    // Launch the image picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!pickerResult.canceled) {
      // Create a new journal entry with the selected image
      const newEntry = {
        date: getTodayDate(),
        title: "Photo Journal Entry",
        content: "",
        mediaUri: pickerResult.assets[0].uri,
        createdAt: new Date().toISOString()
      };
      
      // Add entry and get the UUID from database
      const entryWithId = await addEntry(newEntry);
      
      // Navigate to the new entry if we got an ID back
      if (entryWithId?.id) {
        router.push(`/journal/${entryWithId.id}`);
      }
    }
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Calendar size={48} color={Colors.dark.inactive} />
      <Text style={styles.emptyStateTitle}>No Journal Entries</Text>
      <Text style={styles.emptyStateDescription}>
        Start documenting your journey by adding your first journal entry.
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        {isSearching ? (
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.dark.subtext} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search journal entries..."
              placeholderTextColor={Colors.dark.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
            >
              <X size={20} color={Colors.dark.subtext} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setIsSearching(true)}
          >
            <Search size={20} color={Colors.dark.text} />
          </TouchableOpacity>
        )}
      </View>
      
      {sortedEntries.length > 0 ? (
        <FlatList
          data={sortedEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JournalCard 
              entry={item} 
              isTaskValidation={!!item.taskId}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
              colors={[Colors.dark.primary]}
            />
          }
        />
      ) : (
        renderEmptyState()
      )}
      
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEntry}
        >
          <Plus size={24} color="#000000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 8,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for FAB
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  fab: {
    backgroundColor: Colors.dark.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.common.shadow,
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
});