// Location helpers using expo-location.
import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation() {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn('[geo] failed to get location:', e.message);
    // DEMO ONLY fallback: a Bhopal coordinate so the demo always has a location.
    return { latitude: 23.2563, longitude: 77.4009 };
  }
}
