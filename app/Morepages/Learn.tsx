import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Platform,
  Dimensions,
  Image,
  Modal,
  useWindowDimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  steps: string[];
  tips: string[];
}

const exercises: Exercise[] = [
  {
    id: '1',
    name: 'Squats',
    category: 'Legs',
    description: 'A fundamental lower body exercise that targets the quadriceps, hamstrings, and glutes.',
    images: [
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    ],
    steps: [
      'Stand with feet shoulder-width apart',
      'Lower your body by bending your knees and hips',
      'Keep your back straight and chest up',
      'Go as low as your flexibility allows',
      'Push through your heels to return to starting position'
    ],
    tips: [
      'Keep your knees aligned with your toes',
      'Don\'t let your knees extend past your toes',
      'Breathe steadily throughout the movement'
    ]
  },
  {
    id: '2',
    name: 'Push-ups',
    category: 'Chest',
    description: 'A classic bodyweight exercise that strengthens the chest, shoulders, and triceps.',
    images: [
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    ],
    steps: [
      'Start in a plank position with hands slightly wider than shoulders',
      'Lower your body by bending your elbows',
      'Keep your body in a straight line from head to heels',
      'Push back up to the starting position'
    ],
    tips: [
      'Keep your core tight throughout the movement',
      'Don\'t let your hips sag',
      'Breathe out as you push up'
    ]
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'Back',
    description: 'A compound exercise that targets the posterior chain including the back, glutes, and hamstrings.',
    images: [
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    ],
    steps: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Bend at hips and knees to grip the bar',
      'Keep your back flat and chest up',
      'Lift the bar by extending hips and knees',
      'Lower the bar with control back to the floor'
    ],
    tips: [
      'Keep the bar close to your body throughout the movement',
      'Engage your lats before lifting',
      'Maintain a neutral spine position'
    ]
  },
  {
    id: '4',
    name: 'Pull-ups',
    category: 'Back',
    description: 'An upper body exercise that primarily targets the back and biceps.',
    images: [
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    ],
    steps: [
      'Hang from a pull-up bar with hands slightly wider than shoulders',
      'Pull your body up by bending your elbows',
      'Continue until your chin clears the bar',
      'Lower yourself with control back to the starting position'
    ],
    tips: [
      'Start with assisted pull-ups if needed',
      'Focus on engaging your back muscles',
      'Avoid swinging your body'
    ]
  },
  {
    id: '5',
    name: 'Plank',
    category: 'Core',
    description: 'An isometric core exercise that strengthens the entire body.',
    images: [
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    ],
    steps: [
      'Start in a push-up position with forearms on the ground',
      'Keep your body in a straight line from head to heels',
      'Hold this position for the desired duration'
    ],
    tips: [
      'Engage your core throughout',
      'Don\'t let your hips sag',
      'Breathe steadily'
    ]
  }
];

export default function Learn() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(150);
  const [layoutReady, setLayoutReady] = useState(false);

  const categories = ['All', ...new Set(exercises.map(exercise => exercise.category))];

  const filteredExercises = selectedCategory === 'All' 
    ? exercises 
    : exercises.filter(exercise => exercise.category === selectedCategory);

  // Adjust layout measurements after first render
  useEffect(() => {
    setLayoutReady(true);
    // Calculate proper header height based on platform and orientation
    const baseHeaderHeight = Platform.OS === 'ios' ? 150 : 130;
    setHeaderHeight(baseHeaderHeight);
  }, [width, height]);

  const openExerciseDetails = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCurrentImageIndex(0);
    setExerciseModalVisible(true);
  };

  const nextImage = () => {
    if (selectedExercise && currentImageIndex < selectedExercise.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };
  
  // Determine dynamic spacing values
  const dynamicHeaderPadding = {
    paddingTop: Platform.OS === 'ios' ? insets.top || 50 : insets.top + 10,
    paddingHorizontal: width < 380 ? 15 : 20,
  };
  
  const imageSize = width < 380 ? 80 : 100;
  const cardPadding = width < 350 ? 10 : 15;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Fixed Header */}
      <View style={[styles.headerContainer, { height: headerHeight + insets.top }]}>
        <LinearGradient
          colors={['#8000ff', '#b300ff']}
          style={[styles.headerGradient, dynamicHeaderPadding]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>Learn proper form with step-by-step guides</Text>
        </LinearGradient>
      </View>

      {/* Fixed Categories */}
      <View style={[styles.categoriesContainer, { top: headerHeight + insets.top - 15 }]}>
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

      {/* Exercise List */}
      <ScrollView 
        style={[styles.scrollView, { marginTop: headerHeight + 75 }]}
        contentContainerStyle={[styles.scrollViewContent, { paddingHorizontal: cardPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredExercises.map((exercise) => (
          <View 
            key={exercise.id} 
            style={styles.exerciseCard}
          >
            <Image 
              source={{ uri: exercise.images[0] }} 
              style={[styles.exerciseImage, { width: imageSize, height: imageSize }]}
            />
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{exercise.category}</Text>
                </View>
              </View>
              <Text style={styles.exerciseDescription} numberOfLines={2}>
                {exercise.description}
              </Text>
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => openExerciseDetails(exercise)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={exerciseModalVisible}
        animationType="slide"
        onRequestClose={() => setExerciseModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <TouchableOpacity 
            style={[styles.closeButton, { top: insets.top || 30 }]}
            onPress={() => setExerciseModalVisible(false)}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {selectedExercise && (
            <>
              <View style={[styles.imageContainer, { height: height * 0.35 }]}>
                <Image
                  source={{ uri: selectedExercise.images[currentImageIndex] }}
                  style={styles.exerciseDetailImage}
                  resizeMode="contain"
                />
                
                {selectedExercise.images.length > 1 && (
                  <View style={styles.imageNavigation}>
                    <TouchableOpacity 
                      style={[styles.navButton, currentImageIndex === 0 && styles.navButtonDisabled]}
                      onPress={prevImage}
                      disabled={currentImageIndex === 0}
                    >
                      <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    
                    <View style={styles.imageIndicators}>
                      {selectedExercise.images.map((_, index) => (
                        <View 
                          key={index} 
                          style={[
                            styles.indicator, 
                            currentImageIndex === index && styles.indicatorActive
                          ]} 
                        />
                      ))}
                    </View>
                    
                    <TouchableOpacity 
                      style={[
                        styles.navButton, 
                        currentImageIndex === selectedExercise.images.length - 1 && styles.navButtonDisabled
                      ]}
                      onPress={nextImage}
                      disabled={currentImageIndex === selectedExercise.images.length - 1}
                    >
                      <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <ScrollView 
                style={[styles.exerciseDetailsContainer, { maxHeight: height * 0.65 }]}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              >
                <Text style={styles.exerciseDetailTitle}>{selectedExercise.name}</Text>
                <View style={styles.exerciseDetailCategoryContainer}>
                  <Text style={styles.exerciseDetailCategory}>{selectedExercise.category}</Text>
                </View>
                
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.sectionText}>{selectedExercise.description}</Text>
                </View>
                
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Steps</Text>
                  {selectedExercise.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tips</Text>
                  {selectedExercise.tips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <Ionicons name="bulb-outline" size={20} color="#8000ff" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
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
  categoriesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 15,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriesScroll: {
    paddingHorizontal: 15,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#8000ff',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  exerciseImage: {
    width: 100,
    height: 100,
  },
  exerciseInfo: {
    flex: 1,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  categoryTag: {
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8000ff',
  },
  exerciseDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  detailsButton: {
    backgroundColor: '#8000ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseDetailImage: {
    width: '100%',
    height: '100%',
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  exerciseDetailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: -20,
  },
  exerciseDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  exerciseDetailCategoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  exerciseDetailCategory: {
    fontSize: 16,
    color: '#8000ff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8000ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginLeft: 10,
  },
});
