import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
  Linking,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrivacyItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value?: boolean;
  onToggle?: () => void;
  showSwitch?: boolean;
  onPress?: () => void;
}

export default function Privacy() {
  const [dataCollection, setDataCollection] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const PrivacyItem: React.FC<PrivacyItemProps> = ({ 
    icon, 
    title, 
    description, 
    value, 
    onToggle, 
    showSwitch = true,
    onPress 
  }) => (
    <TouchableOpacity 
      style={styles.privacyItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.privacyItemHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color="#b300ff" />
        </View>
        <View style={styles.privacyItemText}>
          <Text style={styles.privacyItemTitle}>{title}</Text>
          <Text style={styles.privacyItemDescription}>{description}</Text>
        </View>
      </View>
      {showSwitch && onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#b300ff' }}
          thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
        />
      )}
    </TouchableOpacity>
  );

  const handleDeleteAccount = () => {
    // Implement account deletion logic
  };

  const handleExportData = () => {
    // Implement data export logic
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? "dark-content" : "light-content"}
        backgroundColor="#000000"
        translucent={Platform.OS === 'android'}
      />
      
      <View style={[
        styles.header, 
        { 
          paddingTop: Platform.OS === 'ios' ? insets.top > 0 ? 0 : 16 : 16,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          marginTop: Platform.OS === 'ios' ? insets.top > 0 ? 0 : 16 : 50,
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Data</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ 
          paddingLeft: Math.max(0, insets.left),
          paddingRight: Math.max(0, insets.right),
          paddingBottom: Math.max(16, insets.bottom)
        }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <PrivacyItem
            icon="shield-checkmark"
            title="Data Collection"
            description="Allow app to collect usage data to improve your experience"
            value={dataCollection}
            onToggle={() => setDataCollection(!dataCollection)}
          />
          <PrivacyItem
            icon="analytics"
            title="Analytics"
            description="Help us improve by sharing anonymous usage data"
            value={analytics}
            onToggle={() => setAnalytics(!analytics)}
          />
          <PrivacyItem
            icon="megaphone"
            title="Marketing Communications"
            description="Receive updates about new features and promotions"
            value={marketing}
            onToggle={() => setMarketing(!marketing)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          <PrivacyItem
            icon="download"
            title="Export My Data"
            description="Download a copy of your personal data"
            onPress={handleExportData}
            showSwitch={false}
          />
          <PrivacyItem
            icon="trash"
            title="Delete Account"
            description="Permanently delete your account and all associated data"
            onPress={handleDeleteAccount}
            showSwitch={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <PrivacyItem
            icon="document-text"
            title="Privacy Policy"
            description="Read our complete privacy policy"
            onPress={() => Linking.openURL('https://yourapp.com/privacy')}
            showSwitch={false}
          />
          <PrivacyItem
            icon="document"
            title="Terms of Service"
            description="Read our terms of service"
            onPress={() => Linking.openURL('https://yourapp.com/terms')}
            showSwitch={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
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
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  content: {
    flex: 1,
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
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  privacyItemHeader: {
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
  privacyItemText: {
    flex: 1,
  },
  privacyItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  privacyItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
});
