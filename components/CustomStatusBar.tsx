import { StatusBar, Platform } from 'react-native';
import { useEffect } from 'react';

export default function CustomStatusBar() {
  useEffect(() => {
    // Set status bar color for Android
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#000000');
    }
    // Set status bar style for both platforms
    StatusBar.setBarStyle('light-content');
  }, []);

  return (
    <StatusBar
      barStyle="light-content"
      backgroundColor="#000000"
      translucent={Platform.OS === 'android'}
    />
  );
} 