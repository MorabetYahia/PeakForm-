import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Text, Platform} from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#b300ff",
        tabBarInactiveTintColor: "#aaaaaa",
        tabBarStyle: {
          backgroundColor: 'rgba(22, 22, 32, 0.95)',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(138, 43, 226, 0.2)',
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 1,
          marginBottom: 3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="suivi"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="shopping-bag" color={color} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color }) => <MaterialIcons name="work" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Feather name="settings" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    height: '100%',
  },
  activeIconBackground: {
    borderRadius: 10,
    padding: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  inactiveIconContainer: {
    borderRadius: 10,
    padding: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeIconLabel: {
    color: '#b300ff',
    fontWeight: '600',
  },
  inactiveIconLabel: {
    color: '#888888',
  },
});
