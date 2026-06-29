import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../App';
import { useLang } from '../i18n';
import { colors, serif } from '../theme';
import TricolorStrip from '../components/TricolorStrip';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t, lang, toggle } = useLang();
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('phone'); // 'phone' | 'otp'
  const [busy, setBusy] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      Alert.alert(t('invalid_number'), t('invalid_number_msg'));
      return;
    }
    setBusy(true);
    try {
      const r = await api.sendOtp(phone);
      setDemoOtp(r.data.data.demo_otp || '123456');
      setStage('otp');
    } catch (e) {
      Alert.alert(t('error'), e.response?.data?.error || 'Could not send OTP. Is the backend running?');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await api.verifyOtp(phone, otp, 'Rahul Sharma');
      await signIn(r.data.data.token, r.data.data.user);
    } catch (e) {
      Alert.alert(t('error'), e.response?.data?.error || 'Invalid OTP');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <TouchableOpacity style={styles.langToggle} onPress={toggle}>
        <Text style={styles.langText}>{lang === 'hi' ? 'English' : 'हिंदी'}</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.emblem}><Text style={styles.emblemIcon}>🛡️</Text></View>
        <Text style={styles.title}>नागरिक ट्रैफिक सेवा</Text>
        <Text style={styles.titleSub}>MP Nagrik Traffic Seva</Text>
        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <TricolorStrip style={styles.cardStrip} />
        <View style={styles.cardBody}>
          <Text style={styles.label}>{t('phone_number')}</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={stage === 'phone'}
              placeholder="98765 43210"
              placeholderTextColor={colors.faint}
              maxLength={10}
            />
          </View>

          {stage === 'phone' ? (
            <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={busy}>
              <Text style={styles.btnText}>{busy ? t('sending') : t('send_otp')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>{t('enter_otp')}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                placeholder="------"
                placeholderTextColor={colors.faint}
                maxLength={6}
                autoFocus
              />
              <Text style={styles.demoHint}>({t('demo_otp')}: {demoOtp || '123456'})</Text>
              <TouchableOpacity style={styles.btn} onPress={verify} disabled={busy}>
                <Text style={styles.btnText}>{busy ? t('verifying') : t('verify_continue')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStage('phone')}>
                <Text style={styles.changeNo}>{t('change_number')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, justifyContent: 'center', padding: 24 },
  langToggle: { position: 'absolute', top: 56, right: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  langText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  header: { alignItems: 'center', marginBottom: 24 },
  emblem: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  emblemIcon: { fontSize: 40 },
  title: { fontFamily: serif, color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 12 },
  titleSub: { color: colors.navySoft, fontSize: 12, marginTop: 2 },
  subtitle: { color: colors.navySoft, marginTop: 8, fontSize: 13 },
  card: { backgroundColor: colors.paper, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardStrip: { height: 4 },
  cardBody: { padding: 20 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, backgroundColor: '#fff' },
  prefix: { paddingHorizontal: 12, fontSize: 16, color: colors.ink, fontWeight: '600' },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16, color: colors.ink },
  otpInput: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, letterSpacing: 8, textAlign: 'center', fontSize: 22, backgroundColor: '#fff' },
  demoHint: { color: colors.muted2, fontSize: 12, marginTop: 6, textAlign: 'center' },
  btn: { backgroundColor: colors.saffron, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  changeNo: { color: colors.navy, textAlign: 'center', marginTop: 12, fontWeight: '600' },
});
