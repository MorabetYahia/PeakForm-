import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Dimensions,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface GuideSection {
  title: string;
  icon: string;
  description: string;
  features: string[];
}

const guideSections: GuideSection[] = [
  {
    title: "Profile Management",
    icon: "person-circle-outline",
    description: "Manage your personal information and profile settings",
    features: [
      "Update your profile picture",
      "Edit personal information",
      "Manage account settings",
      "View and update your profile details"
    ]
  },
  {
    title: "Shopping Experience",
    icon: "cart-outline",
    description: "Browse and purchase fitness equipment and supplements",
    features: [
      "View product catalog",
      "Add items to cart",
      "Secure checkout process",
      "Track your orders",
      "View order history"
    ]
  },
  {
    title: "Training Programs",
    icon: "fitness-outline",
    description: "Access personalized training programs and workouts",
    features: [
      "View workout plans",
      "Track your progress",
      "Access exercise library",
      "Get personalized recommendations"
    ]
  },
  {
    title: "Nutrition Guidance",
    icon: "nutrition-outline",
    description: "Get nutrition advice and meal planning assistance",
    features: [
      "Access meal plans",
      "View nutrition tips",
      "Track your diet",
      "Get dietary recommendations"
    ]
  },
  {
    title: "Support & Help",
    icon: "help-circle-outline",
    description: "Access help and support resources",
    features: [
      "View FAQ section",
      "Contact support",
      "Access help guides",
      "Get troubleshooting assistance"
    ]
  }
];

export default function Guide() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const isSmallDevice = width < 375;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <View style={styles.header}>
        <LinearGradient
          colors={['#8000ff', '#b300ff']}
          style={[
            styles.gradient,
            { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isSmallDevice && styles.smallDeviceText]}>Features Guide</Text>
          <Text style={[styles.headerSubtitle, isSmallDevice && styles.smallDeviceSubtitle]}>Learn about all the features available in the app</Text>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {guideSections.map((section, index) => (
          <View key={index} style={[styles.section, isSmallDevice && styles.smallDeviceSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={section.icon as any} size={24} color="#8000ff" />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text style={[styles.sectionTitle, isSmallDevice && styles.smallDeviceText]}>{section.title}</Text>
                <Text style={[styles.sectionDescription, isSmallDevice && styles.smallDeviceText]}>{section.description}</Text>
              </View>
            </View>
            
            <View style={styles.featuresList}>
              {section.features.map((feature, featureIndex) => (
                <View key={featureIndex} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={isSmallDevice ? 18 : 20} color="#8000ff" />
                  <Text style={[styles.featureText, isSmallDevice && styles.smallDeviceText]}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.helpSection, isSmallDevice && styles.smallDeviceSection]}>
          <Text style={[styles.helpTitle, isSmallDevice && styles.smallDeviceText]}>Need More Help?</Text>
          <Text style={[styles.helpText, isSmallDevice && styles.smallDeviceText]}>
            If you need additional assistance or have specific questions, please visit our FAQ section or contact our support team.
          </Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => router.push('/Morepages/FAQ')}
          >
            <Text style={styles.helpButtonText}>Visit FAQ</Text>
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
    height: Platform.OS === 'ios' ? 180 : 200,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 15,
    marginTop: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
  },
  featuresList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 10,
    flex: 1,
  },
  helpSection: {
    marginTop: 10,
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  helpButton: {
    backgroundColor: '#8000ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  smallDeviceText: {
    fontSize: 14,
  },
  smallDeviceSubtitle: {
    fontSize: 13,
  },
  smallDeviceSection: {
    padding: 15,
    marginBottom: 16,
  }
});
