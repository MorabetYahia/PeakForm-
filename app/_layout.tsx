import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';
import CustomStatusBar from '../components/CustomStatusBar';

export default function Layout() {
  // Handle back button press more gracefully
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Let the system handle it natively if possible
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <>
      <CustomStatusBar />
      <SafeAreaProvider>
        <Stack screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: '#fff' },
          animationTypeForReplace: 'push',
          // These options help prevent the white flash
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          presentation: Platform.select({
            ios: 'card',
            android: 'transparentModal',
          }),
        }}>
          <Stack.Screen name="LoginScreen" options={{ headerShown: false }} />
          <Stack.Screen name="signUpScreen" options={{ headerShown: false }} />
          <Stack.Screen name="Forgetpw" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabsclient)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabscoach)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </>
  );
}