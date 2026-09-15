import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  SafeAreaView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SecurityItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  showSwitch?: boolean;
}

export default function Security() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const SecurityItem: React.FC<SecurityItemProps> = ({ 
    icon, 
    title, 
    description, 
    value, 
    onToggle, 
    showSwitch = true 
  }) => (
    <View style={styles.securityItem}>
      <View style={styles.securityItemHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color="#b300ff" />
        </View>
        <View style={styles.securityItemText}>
          <Text style={styles.securityItemTitle}>{title}</Text>
          <Text style={styles.securityItemDescription}>{description}</Text>
        </View>
      </View>
      {showSwitch && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#b300ff' }}
          thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[
        styles.header, 
        { 
          paddingTop: Platform.OS === 'android' ? insets.top + 16 : 16,
          paddingHorizontal: width > 500 ? 24 : 16
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color="#b300ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
      >
        <View style={[styles.section, { paddingHorizontal: width > 500 ? 24 : 16 }]}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <SecurityItem
            icon="shield-checkmark"
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            value={twoFactorEnabled}
            onToggle={() => setTwoFactorEnabled(!twoFactorEnabled)}
          />
        </View>

        <View style={[styles.section, { paddingHorizontal: width > 500 ? 24 : 16 }]}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <SecurityItem
            icon="notifications"
            title="Security Notifications"
            description="Get alerts about suspicious activity"
            value={notificationsEnabled}
            onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
          />
        </View>

        <View style={[styles.section, { paddingHorizontal: width > 500 ? 24 : 16 }]}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity 
            style={styles.securityItem}
            onPress={() => router.push('/Morepages/Changepswd')}
          >
            <View style={styles.securityItemHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="key" size={24} color="#b300ff" />
              </View>
              <View style={styles.securityItemText}>
                <Text style={styles.securityItemTitle}>Change Password</Text>
                <Text style={styles.securityItemDescription}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#f5eeff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    ...Platform.select({
      ios: {
        fontWeight: '600',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        fontWeight: '600',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  securityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityItemText: {
    flex: 1,
  },
  securityItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    ...Platform.select({
      ios: {
        fontWeight: '500',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  securityItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
