import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../App';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('phone'); // 'phone' | 'otp'
  const [busy, setBusy] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit phone number.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.sendOtp(phone);
      setDemoOtp(r.data.data.demo_otp || '123456');
      setStage('otp');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not send OTP. Is the backend running?');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await api.verifyOtp(phone, otp, 'Rahul Sharma');
      await signIn(r.data.data.token, r.data.data.user);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Invalid OTP');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.title}>MP Nagrik Traffic Seva</Text>
        <Text style={styles.subtitle}>Sign in to report violations</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={stage === 'phone'}
            placeholder="98765 43210"
            maxLength={10}
          />
        </View>

        {stage === 'phone' ? (
          <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Sending…' : 'Send OTP'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.label, { marginTop: 16 }]}>Enter OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              placeholder="------"
              maxLength={6}
              autoFocus
            />
            <Text style={styles.demoHint}>(Demo OTP: {demoOtp || '123456'})</Text>
            <TouchableOpacity style={styles.btn} onPress={verify} disabled={busy}>
              <Text style={styles.btnText}>{busy ? 'Verifying…' : 'Verify & Continue'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStage('phone')}>
              <Text style={styles.changeNo}>Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b3d91', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 56 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#bcd', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10 },
  prefix: { paddingHorizontal: 12, fontSize: 16, color: '#333', fontWeight: '600' },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16 },
  otpInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, letterSpacing: 8, textAlign: 'center', fontSize: 22 },
  demoHint: { color: '#888', fontSize: 12, marginTop: 6, textAlign: 'center' },
  btn: { backgroundColor: '#ff6b00', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  changeNo: { color: '#0b3d91', textAlign: 'center', marginTop: 12 },
});
