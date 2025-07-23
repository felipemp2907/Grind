import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Link, useRouter } from 'expo-router';
import { Target, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, resetPassword, resendConfirmationEmail, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  
  // If already authenticated, redirect to main app
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);
  
  // Handle deep links for email confirmation
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('confirmation') || url.includes('verify')) {
        Alert.alert(
          "Email Confirmed",
          "Your email has been confirmed. You can now log in.",
          [{ text: "OK" }]
        );
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  
  // Show error alert if login fails
  useEffect(() => {
    if (error) {
      // Check if it's an email confirmation error
      if (error.includes('Email not confirmed') || error.includes('not been confirmed')) {
        Alert.alert(
          'Email Not Confirmed', 
          'Your email has not been confirmed. Would you like to resend the confirmation email?',
          [
            { text: 'Cancel', onPress: clearError },
            { text: 'Resend', onPress: () => {
              clearError();
              setShowResendConfirmation(true);
            }}
          ]
        );
      } else {
        Alert.alert('Login Failed', error, [
          { text: 'OK', onPress: clearError }
        ]);
      }
    }
  }, [error]);
  
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }
    
    await login({ email, password });
  };
  
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password');
      return;
    }
    
    await resetPassword(email);
    setShowForgotPassword(false);
  };
  
  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to resend the confirmation');
      return;
    }
    
    await resendConfirmationEmail(email);
    setShowResendConfirmation(false);
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Target size={32} color={Colors.dark.primary} />
              <Text style={styles.logoText}>Grind</Text>
            </View>
            <Text style={styles.tagline}>Your AI Assistant for Daily Discipline</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            
            <View style={styles.inputContainer}>
              <Mail size={20} color={Colors.dark.subtext} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.dark.subtext}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Lock size={20} color={Colors.dark.subtext} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.dark.subtext}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.dark.subtext} />
                ) : (
                  <Eye size={20} color={Colors.dark.subtext} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionLinksContainer}>
              <TouchableOpacity 
                onPress={() => setShowForgotPassword(true)}
              >
                <Text style={styles.actionLinkText}>Forgot Password?</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowResendConfirmation(true)}
              >
                <Text style={styles.actionLinkText}>Resend Confirmation</Text>
              </TouchableOpacity>
            </View>
            
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <GoogleSignInButton
              onPress={handleGoogleLogin}
              loading={isLoading}
            />
            
            {/* Demo Google Auth Notice */}
            <View style={styles.demoNoticeContainer}>
              <AlertCircle size={16} color={Colors.dark.warning || '#f59e0b'} />
              <Text style={styles.demoNoticeText}>
                Google sign-in is a demo feature. If it fails, please disable email confirmations in Supabase settings or use regular email/password login.
              </Text>
            </View>
            
            {/* Email confirmation notice */}
            <View style={styles.noticeContainer}>
              <AlertCircle size={16} color={Colors.dark.primary} />
              <Text style={styles.noticeText}>
                After registration, please check your inbox and spam folder for the confirmation email.
              </Text>
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <View style={styles.inputContainer}>
              <Mail size={20} color={Colors.dark.subtext} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.dark.subtext}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <Button
                title="Cancel"
                onPress={() => setShowForgotPassword(false)}
                style={styles.cancelButton}
                textStyle={styles.cancelButtonText}
              />
              <Button
                title="Send Reset Link"
                onPress={handleForgotPassword}
                loading={isLoading}
                style={styles.resetButton}
              />
            </View>
          </View>
        </View>
      )}
      
      {/* Resend Confirmation Modal */}
      {showResendConfirmation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Resend Confirmation Email</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a new confirmation email.
            </Text>
            
            <View style={styles.inputContainer}>
              <Mail size={20} color={Colors.dark.subtext} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.dark.subtext}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <Button
                title="Cancel"
                onPress={() => setShowResendConfirmation(false)}
                style={styles.cancelButton}
                textStyle={styles.cancelButtonText}
              />
              <Button
                title="Resend Email"
                onPress={handleResendConfirmation}
                loading={isLoading}
                style={styles.resetButton}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    color: Colors.dark.text,
    marginLeft: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  actionLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionLinkText: {
    color: Colors.dark.primary,
    fontSize: 14,
  },
  loginButton: {
    marginTop: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.subtext,
    opacity: 0.3,
  },
  dividerText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    marginHorizontal: 16,
  },
  demoNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  demoNoticeText: {
    flex: 1,
    fontSize: 11,
    color: Colors.dark.text,
    marginLeft: 8,
    opacity: 0.8,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.text,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.dark.subtext,
  },
  signupLink: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 24,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  cancelButtonText: {
    color: Colors.dark.primary,
  },
  resetButton: {
    flex: 1,
    marginLeft: 8,
  },
});