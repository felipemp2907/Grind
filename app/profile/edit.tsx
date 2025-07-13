import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Camera, Edit, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { supabase, checkDatabaseSetup, setupDatabase, serializeError } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import DatabaseSetupPrompt from '@/components/DatabaseSetupPrompt';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();
  const { user } = useAuthStore();
  
  const [name, setName] = useState(profile?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsDbSetup, setNeedsDbSetup] = useState(false);
  
  // Fetch current avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        setIsLoading(true);
        setError(null);
        
        try {
          // Check database setup
          const dbResult = await setupDatabase();
          
          if (!dbResult.success) {
            setNeedsDbSetup(true);
            setIsLoading(false);
            return;
          }
          
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
            
          if (error) {
            if (error.code === 'PGRST116') {
              // Not found is okay, just means no avatar yet
              console.log("No profile found, will create one when saving");
            } else {
              console.error("Error fetching avatar:", serializeError(error));
              setError(`Failed to fetch avatar: ${serializeError(error)}`);
            }
          } else if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.error("Error fetching avatar:", errorMessage);
          setError(`Failed to fetch avatar: ${errorMessage}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchAvatar();
  }, [user]);
  
  // Show error alert if there's an error
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [
        { text: "OK", onPress: () => setError(null) }
      ]);
    }
  }, [error]);
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Resize image to reduce file size
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 300, height: 300 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );
        
        setNewAvatar(manipResult.uri);
      }
    } catch (error) {
      const errorMessage = serializeError(error);
      console.error("Error picking image:", errorMessage);
      Alert.alert("Error", `Failed to pick image: ${errorMessage}`);
    }
  };
  
  const takePhoto = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert("Permission required", "Camera permission is required to take photos");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Resize image to reduce file size
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 300, height: 300 } }],
          { format: SaveFormat.JPEG, compress: 0.7 }
        );
        
        setNewAvatar(manipResult.uri);
      }
    } catch (error) {
      const errorMessage = serializeError(error);
      console.error("Error taking photo:", errorMessage);
      Alert.alert("Error", `Failed to take photo: ${errorMessage}`);
    }
  };
  
  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Check database setup
      const dbResult = await setupDatabase();
      if (!dbResult.success) {
        setNeedsDbSetup(true);
        return null;
      }
      
      // Check if the storage bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error listing buckets:", serializeError(bucketsError));
        throw new Error("Failed to access storage. Please check your Supabase configuration.");
      }
      
      // Check if 'profiles' bucket exists
      const profilesBucket = buckets?.find(bucket => bucket.name === 'profiles');
      
      if (!profilesBucket) {
        // Create the bucket if it doesn't exist
        try {
          const { error: createBucketError } = await supabase.storage.createBucket('profiles', {
            public: true
          });
          
          if (createBucketError) {
            console.error("Error creating bucket:", serializeError(createBucketError));
            throw new Error("Failed to create storage bucket. Please check your Supabase permissions.");
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.error("Error creating bucket:", errorMessage);
          throw new Error("Failed to create storage bucket. Please check your Supabase permissions.");
        }
      }
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique file name
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob);
        
      if (uploadError) {
        console.error("Error uploading avatar:", serializeError(uploadError));
        throw uploadError;
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      const errorMessage = serializeError(error);
      console.error("Error uploading avatar:", errorMessage);
      Alert.alert("Upload Failed", `Failed to upload profile picture: ${errorMessage}`);
      return null;
    }
  };
  
  const handleSave = async () => {
    if (name.trim() === '') {
      Alert.alert("Invalid Name", "Please enter a valid name");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Check database setup
      const dbResult = await setupDatabase();
      if (!dbResult.success) {
        setNeedsDbSetup(true);
        return;
      }
      
      let avatarUrlToSave = avatarUrl;
      
      // If there's a new avatar, upload it
      if (newAvatar) {
        const uploadedUrl = await uploadAvatar(newAvatar);
        if (uploadedUrl) {
          avatarUrlToSave = uploadedUrl;
        }
      }
      
      // Update or create profile in Supabase using upsert
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: name.trim(),
            avatar_url: avatarUrlToSave,
            level: profile?.level || 1,
            xp: profile?.xp || 0,
            streak_days: profile?.streakDays || 0,
            longest_streak: profile?.longestStreak || 0
          }, {
            onConflict: 'id'
          });
          
        if (error) {
          console.error("Error saving profile:", serializeError(error));
          Toast.show({
            type: 'error',
            text1: 'Profile Save Failed',
            text2: `Failed to save profile: ${serializeError(error)}`
          });
          throw new Error(`Failed to save profile: ${serializeError(error)}`);
        } else {
          Toast.show({
            type: 'success',
            text1: 'Profile Saved',
            text2: 'Your profile has been updated successfully'
          });
        }
      }
      
      // Update local state
      await updateProfile({ 
        name: name.trim(),
        avatarUrl: avatarUrlToSave || undefined
      });
      
      router.back();
    } catch (error) {
      const errorMessage = serializeError(error);
      console.error("Error saving profile:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };
  
  const removeAvatar = () => {
    Alert.alert(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setNewAvatar(null);
            setAvatarUrl(null);
            
            if (user?.id) {
              try {
                // Check database setup
                const dbResult = await setupDatabase();
                if (!dbResult.success) {
                  setNeedsDbSetup(true);
                  return;
                }
                
                const { error } = await supabase
                  .from('profiles')
                  .upsert({
                    id: user.id,
                    name: profile?.name || 'User',
                    avatar_url: null,
                    level: profile?.level || 1,
                    xp: profile?.xp || 0,
                    streak_days: profile?.streakDays || 0,
                    longest_streak: profile?.longestStreak || 0
                  }, {
                    onConflict: 'id'
                  });
                  
                if (error) {
                  console.error("Error removing avatar:", serializeError(error));
                  Alert.alert("Error", `Failed to remove profile picture: ${serializeError(error)}`);
                }
              } catch (error) {
                const errorMessage = serializeError(error);
                console.error("Error removing avatar:", errorMessage);
                Alert.alert("Error", `Failed to remove profile picture: ${errorMessage}`);
              }
            }
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{
          title: "Edit Profile",
          headerRight: () => (
            <Button 
              title="Save" 
              onPress={handleSave} 
              variant="primary" 
              size="small" 
              loading={isSaving}
              disabled={isSaving}
            />
          )
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={Colors.dark.primary} />
              ) : newAvatar ? (
                <Image source={{ uri: newAvatar }} style={styles.avatar} />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarPlaceholder}>
                  {name.charAt(0).toUpperCase() || "U"}
                </Text>
              )}
              
              <View style={styles.editAvatarButton}>
                <Edit size={16} color={Colors.dark.text} />
              </View>
            </View>
            
            <View style={styles.avatarActions}>
              <TouchableOpacity 
                style={styles.avatarActionButton} 
                onPress={pickImage}
              >
                <Upload size={20} color={Colors.dark.primary} />
                <Text style={styles.avatarActionText}>Upload</Text>
              </TouchableOpacity>
              
              {Platform.OS !== 'web' && (
                <TouchableOpacity 
                  style={styles.avatarActionButton} 
                  onPress={takePhoto}
                >
                  <Camera size={20} color={Colors.dark.primary} />
                  <Text style={styles.avatarActionText}>Camera</Text>
                </TouchableOpacity>
              )}
              
              {(avatarUrl || newAvatar) && (
                <TouchableOpacity 
                  style={styles.avatarActionButton} 
                  onPress={removeAvatar}
                >
                  <X size={20} color={Colors.dark.danger} />
                  <Text style={[styles.avatarActionText, { color: Colors.dark.danger }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Profile Information Section */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.dark.subtext}
            />
            
            {/* Email (non-editable) */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ""}
              editable={false}
            />
          </View>
          
          {/* Save Button for bottom of screen */}
          <Button
            title="Save Changes"
            onPress={handleSave}
            style={styles.saveButton}
            loading={isSaving}
            disabled={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.dark.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  avatarActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActionText: {
    color: Colors.dark.primary,
    fontSize: 12,
    marginTop: 4,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.subtext,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  disabledInput: {
    opacity: 0.7,
  },
  saveButton: {
    marginTop: 16,
  },
});