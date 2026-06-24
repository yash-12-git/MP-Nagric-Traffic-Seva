import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { api, getToken, setToken } from './services/api';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CaptureScreen from './screens/CaptureScreen';
import SubmitScreen from './screens/SubmitScreen';
import MyCasesScreen from './screens/MyCasesScreen';
import ProfileScreen from './screens/ProfileScreen';

// --- Auth context ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff6b00',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="MyCasesTab" component={MyCasesScreen}
        options={{ title: 'My Reports', tabBarIcon: tabIcon('📋') }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);

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
          {booting ? (
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : !user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeTabs} />
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="Submit" component={SubmitScreen}
                options={{ headerShown: true, title: 'Submit Report', headerTintColor: '#0b3d91' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
