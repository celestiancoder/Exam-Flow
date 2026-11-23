import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Role = 'Instructor' | 'Exam Cell';
type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Instructor');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter an email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    const { data, error } =
      authMode === 'signin'
        ? await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
    setLoading(false);

    if (error) {
      Alert.alert(authMode === 'signin' ? 'Login failed' : 'Sign up failed', error.message);
      return;
    }

    if (authMode === 'signup' && !data.session) {
      Alert.alert(
        'Check your email',
        'Confirm your email address, then sign in with this account.'
      );
      setAuthMode('signin');
      return;
    }

    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.page, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>EXAM OPERATIONS</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage exam printing</Text>

        <View style={styles.roleToggle}>
          {(['Instructor', 'Exam Cell'] as Role[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              style={[styles.roleButton, role === option && styles.roleButtonActive]}>
              <Text style={[styles.roleText, role === option && styles.roleTextActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@institution.edu"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <Pressable style={[styles.primaryButton, loading && styles.disabled]} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              {authMode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.switchButton}
          onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.switchText}>
            {authMode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#090909', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 430, backgroundColor: '#111111', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#292929' },
  eyebrow: { color: '#777777', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#929292', marginTop: 6, marginBottom: 24 },
  roleToggle: { flexDirection: 'row', backgroundColor: '#090909', borderRadius: 12, padding: 4, marginBottom: 22, borderWidth: 1, borderColor: '#292929' },
  roleButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  roleButtonActive: { backgroundColor: '#FFFFFF' },
  roleText: { color: '#929292', fontWeight: '700' },
  roleTextActive: { color: '#090909' },
  label: { color: '#BBBBBB', fontWeight: '700', marginBottom: 8, marginTop: 12 },
  input: { height: 52, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 12, paddingHorizontal: 14, color: '#FFFFFF', backgroundColor: '#090909' },
  primaryButton: { height: 52, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#090909', fontSize: 16, fontWeight: '900' },
  switchButton: { alignItems: 'center', marginTop: 18, paddingVertical: 6 },
  switchText: { color: '#FFFFFF', fontWeight: '700' },
});
