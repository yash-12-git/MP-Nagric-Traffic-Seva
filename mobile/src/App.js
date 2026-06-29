import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { api, getToken, setToken } from './services/api';
import { LanguageProvider, useLang } from './i18n';
import { colors } from './theme';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CaptureScreen from './screens/CaptureScreen';
import SubmitScreen from './screens/SubmitScreen';
import MyCasesScreen from './screens/MyCasesScreen';
import RewardsScreen from './screens/RewardsScreen';
import ProfileScreen from './screens/ProfileScreen';

// --- Auth context ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

function HomeTabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: '#a59c8a',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.paperLight, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen}
        options={{ title: t('tab_home'), tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="MyCasesTab" component={MyCasesScreen}
        options={{ title: t('tab_reports'), tabBarIcon: tabIcon('🧾') }} />
      <Tab.Screen name="RewardsTab" component={RewardsScreen}
        options={{ title: t('tab_rewards'), tabBarIcon: tabIcon('⭐') }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen}
        options={{ title: t('tab_profile'), tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const { ready } = useLang();

  const refreshUser = async () => {
    try {
      const r = await api.me();
      setUser(r.data.data);
      return r.data.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await refreshUser();
      // Keep the splash visible briefly for the demo.
      setTimeout(() => setBooting(false), 1500);
    })();
  }, []);

  const signIn = async (token, u) => { await setToken(token); setUser(u); };
  const signOut = async () => { await setToken(null); setUser(null); };

  const authValue = { user, setUser, refreshUser, signIn, signOut };

  return (
    <AuthContext.Provider value={authValue}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {(booting || !ready) ? (
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : !user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeTabs} />
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="Submit" component={SubmitScreen}
                options={{ headerShown: true, title: '', headerTintColor: colors.navy, headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Navigation />
    </LanguageProvider>
  );
}
