import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const categories = ['All', 'Profile', 'Account', 'Security', 'Payment', 'Support'];

const faqData: FAQItem[] = [
  {
    category: 'Profile',
    question: "How do I update my profile information?",
    answer: "You can update your profile information by clicking on the 'Edit Personal Information' button in your profile section. From there, you can modify your name, email, and other personal details."
  },
  {
    category: 'Profile',
    question: "How do I change my profile picture?",
    answer: "To change your profile picture, simply tap on your current profile image in the profile section. You can then choose to take a new photo or select one from your gallery."
  },
  {
    category: 'Account',
    question: "How do I manage my notifications?",
    answer: "You can manage your notifications by going to the 'Notifications' section in Account Settings. Here you can enable or disable different types of notifications according to your preferences."
  },
  {
    category: 'Payment',
    question: "How do I update my payment methods?",
    answer: "To update your payment methods, go to the 'Payment Methods' section in Account Settings. You can add new payment methods or remove existing ones."
  },
  {
    category: 'Payment',
    question: "How do I view my revenue?",
    answer: "Your revenue information can be accessed through the 'Revenue' section in Account Settings. Here you can view your earnings history and payment details."
  },
  {
    category: 'Account',
    question: "How do I change my privacy settings?",
    answer: "Privacy settings can be managed in the 'Privacy' section of Account Settings. You can control who can see your profile and other personal information."
  },
  {
    category: 'Support',
    question: "How do I get help and support?",
    answer: "For immediate assistance, you can contact our support team through the 'Help & Support' section. We typically respond within 24 hours."
  },
  {
    category: 'Support',
    question: "How do I rate the app?",
    answer: "You can rate the app by going to the 'Rate the App' section. Your feedback helps us improve the app experience for everyone."
  },
  {
    category: 'Account',
    question: "How do I log out of my account?",
    answer: "To log out, simply tap the 'Logout' button at the bottom of the More page. You'll be redirected to the login screen."
  },
  {
    category: 'Security',
    question: "How do I reset my password?",
    answer: "If you need to reset your password, go to the 'Security' section in Account Settings and select 'Reset Password'. You'll receive an email with instructions."
  }
];

export default function FAQ() {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [scrollY] = useState(new Animated.Value(0));
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [Platform.OS === 'ios' ? (isLandscape ? 120 : 160) : (isLandscape ? 100 : 140), 
                 Platform.OS === 'ios' ? 80 : 70],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <Animated.View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={['#8000ff', '#b300ff']}
          style={styles.gradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <Animated.ScrollView 
          style={[
            styles.scrollView, 
            { marginTop: headerHeight }
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.searchAndCategoriesContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search FAQs..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          
            <View style={styles.categoriesContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === category && styles.categoryTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#b300ff" />
              <Text style={styles.emptyStateText}>No FAQs found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or category</Text>
            </View>
          ) : (
            filteredFAQs.map((item, index) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.faqItem,
                  {
                    transform: [{
                      scale: expandedItems.includes(index) ? 1.02 : 1
                    }]
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.questionContainer}
                  onPress={() => toggleItem(index)}
                >
                  <View style={styles.questionContent}>
                    <Text style={styles.categoryTag}>{item.category}</Text>
                    <Text style={styles.question}>{item.question}</Text>
                  </View>
                  <Ionicons
                    name={expandedItems.includes(index) ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#b300ff"
                  />
                </TouchableOpacity>
                
                {expandedItems.includes(index) && (
                  <Animated.View 
                    style={[
                      styles.answerContainer,
                      {
                        opacity: expandedItems.includes(index) ? 1 : 0,
                        transform: [{
                          translateY: expandedItems.includes(index) ? 0 : -20
                        }]
                      }
                    ]}
                  >
                    <Text style={styles.answer}>{item.answer}</Text>
                  </Animated.View>
                )}
              </Animated.View>
            ))
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: Platform.OS === 'ios' ? 160 : 140,
  },
  gradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 30,
    paddingBottom: 15,
    paddingHorizontal: 15,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backButton: {
    marginBottom: Platform.OS === 'ios' ? 10 : 5,
    marginTop: Platform.OS === 'android' ? 5 : 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 24 : 22,
    fontWeight: 'bold',
  },
  searchAndCategoriesContainer: {
    backgroundColor: '#fff',
    paddingTop: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: Platform.OS === 'ios' ? 45 : 48,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
    padding: Platform.OS === 'ios' ? 0 : 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
  },
  categoriesContainer: {
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  categoriesScroll: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#b300ff',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  faqItem: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  questionContent: {
    flex: 1,
    marginRight: 10,
  },
  categoryTag: {
    fontSize: 12,
    color: '#b300ff',
    marginBottom: 5,
    fontWeight: '500',
  },
  question: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    fontWeight: '600',
    color: '#333',
  },
  answerContainer: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  answer: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    color: '#666',
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});
