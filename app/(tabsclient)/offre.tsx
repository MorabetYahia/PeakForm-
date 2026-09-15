import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Platform, Image, Dimensions, ScrollView, ActivityIndicator, RefreshControl, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome, AntDesign, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import supabase from '../lib/supabase';

const { width } = Dimensions.get('window');

// Add objective filter options
const objectives = [
  'All',
  'Weight Loss',
  'Muscle Gain',
  'Strength Training',
  'Cardio',
  'Flexibility',
  'Sports Specific',
  'General Fitness',
  'Endurance Building',
  'Body Toning',
  'Core Strength',
  'High Intensity Training'
];

// Add plan types
const planTypes = [
  'All',
  'fitness',
  'nutrition',
  'fitness & nutrition'
];

// Add level options
const levels = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert'
];

// Add duration options
const durations = [
  'All',
  '7 days',
  '14 days',
  '1 month'
];

interface TransformedPlan {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  price: number;
  description: string;
  rating: number | null;
  level: string;
  plan_duration: string;
  coach_name: string;
  coach_image: string;
}

// Define types for the Supabase response
interface CoachUser {
  Full_name: string;
  profile_image: string;
}

interface Coach {
  coach_id: string;
  user: CoachUser;
}

interface PlanWithCoach {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  price: number;
  description: string;
  rating: number | null;
  level: string;
  plan_duration: string;
  coach: Coach;
}

export default function Offers() {
  const [plans, setPlans] = useState<TransformedPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TransformedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState('All');
  const [isObjectiveModalVisible, setIsObjectiveModalVisible] = useState(false);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [isLevelModalVisible, setIsLevelModalVisible] = useState(false);
  const [isDurationModalVisible, setIsDurationModalVisible] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Update effect to filter plans with all four filters
  useEffect(() => {
    let filtered = plans;
    
    if (selectedObjective !== 'All') {
      filtered = filtered.filter(plan => plan.objective === selectedObjective);
    }
    
    if (selectedType !== 'All') {
      filtered = filtered.filter(plan => plan.type.toLowerCase() === selectedType.toLowerCase());
    }
    
    if (selectedLevel !== 'All') {
      filtered = filtered.filter(plan => plan.level === selectedLevel);
    }
    
    if (selectedDuration !== 'All') {
      filtered = filtered.filter(plan => plan.plan_duration === selectedDuration);
    }
    
    setFilteredPlans(filtered);
  }, [selectedObjective, selectedType, selectedLevel, selectedDuration, plans]);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Since RLS is disabled on all tables, we can use a direct join
      const { data: plansWithCoachData, error: plansError } = await supabase
        .from('plan')
        .select(`
          plan_id, title, objective, type, price, description, rating, level, plan_duration,
          coach:coach_id (
            coach_id,
            user:user_id (
              Full_name, profile_image
            )
          )
        `)
        .eq('status', 'public')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;
      
      console.log('Plans with coach data:', plansWithCoachData);
      
      if (!plansWithCoachData || plansWithCoachData.length === 0) {
        setError('No plans available');
        return;
      }

      // Transform the joined data
      const transformedPlans = (plansWithCoachData as unknown as PlanWithCoach[]).map(plan => {
        return {
          plan_id: plan.plan_id,
          title: plan.title,
          objective: plan.objective,
          type: plan.type,
          price: plan.price,
          description: plan.description,
          rating: plan.rating,
          level: plan.level,
          plan_duration: plan.plan_duration,
          coach_name: plan.coach?.user?.Full_name || 'Unknown Coach',
          coach_image: plan.coach?.user?.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
        };
      });

      console.log('Transformed plans:', transformedPlans);
      setPlans(transformedPlans);
      setFilteredPlans(transformedPlans); // Initialize filtered plans
    } catch (error) {
      console.error('Error in fetchPlans:', error);
      setError('Failed to load plans. Please try again later.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  if (isLoading && plans.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8000ff" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.statusBarSpace} />
      
      <ScrollView 
        style={styles.mainScrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8000ff']}
            tintColor="#8000ff"
            progressBackgroundColor="#ffffff"
          />
        }
      >
        <View style={styles.shadowContainer}>
          <LinearGradient
            colors={['#f8f9fa', '#ffffff']}
            style={styles.headerContainer}
          >
            <Text style={styles.headerTitle}>Available Training Programs</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            <Pressable 
              style={({pressed}) => [
                styles.resetButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => {
                setSelectedObjective('All');
                setSelectedType('All');
                setSelectedLevel('All');
                setSelectedDuration('All');
              }}
            >
              <Feather name="refresh-cw" size={14} color="#8000ff" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          </View>
          
          {/* Top row: Objective and Type filters */}
          <View style={styles.filtersRow}>
            {/* Objective Filter Button */}
            <Pressable 
              style={({pressed}) => [
                styles.filterButton,
                styles.objectiveFilterButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setIsObjectiveModalVisible(true)}
            >
              <View style={styles.filterButtonContent}>
                <MaterialIcons name="fitness-center" size={18} color="#8000ff" />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {selectedObjective === 'All' ? 'Objective' : selectedObjective}
                </Text>
                <Feather name="chevron-down" size={16} color="#8000ff" />
              </View>
            </Pressable>
            
            {/* Type Filter Button */}
            <Pressable 
              style={({pressed}) => [
                styles.filterButton,
                styles.typeFilterButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setIsTypeModalVisible(true)}
            >
              <View style={styles.filterButtonContent}>
                <MaterialIcons name="category" size={18} color="#8000ff" />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {selectedType === 'All' ? 'Type' : selectedType}
                </Text>
                <Feather name="chevron-down" size={16} color="#8000ff" />
              </View>
            </Pressable>
          </View>
          
          {/* Bottom row: Level and Duration filters */}
          <View style={[styles.filtersRow, styles.secondFiltersRow]}>
            {/* Level Filter Button */}
            <Pressable 
              style={({pressed}) => [
                styles.filterButton,
                styles.objectiveFilterButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setIsLevelModalVisible(true)}
            >
              <View style={styles.filterButtonContent}>
                <MaterialCommunityIcons name="sign-direction" size={18} color="#8000ff" />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {selectedLevel === 'All' ? 'Level' : selectedLevel}
                </Text>
                <Feather name="chevron-down" size={16} color="#8000ff" />
              </View>
            </Pressable>
            
            {/* Duration Filter Button */}
            <Pressable 
              style={({pressed}) => [
                styles.filterButton,
                styles.typeFilterButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setIsDurationModalVisible(true)}
            >
              <View style={styles.filterButtonContent}>
                <Ionicons name="calendar-outline" size={18} color="#8000ff" />
                <Text style={styles.filterButtonText} numberOfLines={1}>
                  {selectedDuration === 'All' ? 'Duration' : selectedDuration}
                </Text>
                <Feather name="chevron-down" size={16} color="#8000ff" />
              </View>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.plansContainer}>
          {filteredPlans.length === 0 && !isLoading ? (
            <View style={styles.noPlansContainer}>
              <Ionicons name="fitness-outline" size={50} color="#cccccc" />
              <Text style={styles.noPlansText}>No training programs found with the selected filters</Text>
              <Pressable 
                style={({pressed}) => [
                  styles.resetFilterButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => {
                  setSelectedObjective('All');
                  setSelectedType('All');
                  setSelectedLevel('All');
                  setSelectedDuration('All');
                }}
              >
                <Feather name="refresh-cw" size={16} color="#fff" />
                <Text style={styles.resetFilterText}>Reset All Filters</Text>
              </Pressable>
            </View>
          ) : (
            filteredPlans.map((plan) => (
              <Pressable 
                key={plan.plan_id}
                style={({pressed}) => [
                  styles.planContainer,
                  pressed && styles.planPressed
                ]}
                onPress={() => router.push(`/plan/clickableoffre?id=${plan.plan_id}`)}
              >
                <LinearGradient
                  colors={['#f8f9fa', '#ffffff']}
                  style={styles.planGradient}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.coachInfo}>
                      <Image 
                        source={{ uri: plan.coach_image }} 
                        style={styles.coachImage}
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                      />
                      <View style={styles.coachDetails}>
                        <View style={styles.nameRatingRow}>
                          <Text style={styles.coachName}>{plan.coach_name}</Text>
                          {plan.rating && (
                            <View style={styles.ratingContainer}>
                              <FontAwesome name="star" size={14} color="#FFD700" />
                              <Text style={styles.rating}>{plan.rating.toFixed(1)}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.planName}>{plan.title}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.planDetailsContainer}>
                    <Text 
                      style={styles.planDetails}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {plan.description}
                    </Text>
                    <View style={styles.planStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="barbell-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{plan.type}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{plan.plan_duration}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="trending-up-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{plan.objective}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.actionButtonsContainer}>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.viewDetailsButton,
                        pressed && styles.buttonPressed
                      ]}
                      onPress={() => router.push(`/plan/clickableoffre?id=${plan.plan_id}`)}
                    >
                      <Text style={styles.viewDetailsText}>View Details</Text>
                      <Feather name="arrow-right" size={18} color="#fff" />
                    </Pressable>
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>${plan.price}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Objective Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isObjectiveModalVisible}
        onRequestClose={() => setIsObjectiveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Objective</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsObjectiveModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.objectivesList}>
              {objectives.map((objective) => (
                <TouchableOpacity
                  key={objective}
                  style={[
                    styles.objectiveItem,
                    selectedObjective === objective && styles.selectedObjectiveItem
                  ]}
                  onPress={() => {
                    setSelectedObjective(objective);
                    setIsObjectiveModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.objectiveItemText,
                      selectedObjective === objective && styles.selectedObjectiveItemText
                    ]}
                  >
                    {objective}
                  </Text>
                  {selectedObjective === objective && (
                    <Ionicons name="checkmark-circle" size={24} color="#8000ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Type Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTypeModalVisible}
        onRequestClose={() => setIsTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Type</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsTypeModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.objectivesList}>
              {planTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.objectiveItem,
                    selectedType === type && styles.selectedObjectiveItem
                  ]}
                  onPress={() => {
                    setSelectedType(type);
                    setIsTypeModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.objectiveItemText,
                      selectedType === type && styles.selectedObjectiveItemText
                    ]}
                  >
                    {type}
                  </Text>
                  {selectedType === type && (
                    <Ionicons name="checkmark-circle" size={24} color="#8000ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Level Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isLevelModalVisible}
        onRequestClose={() => setIsLevelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Level</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsLevelModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.objectivesList}>
              {levels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.objectiveItem,
                    selectedLevel === level && styles.selectedObjectiveItem
                  ]}
                  onPress={() => {
                    setSelectedLevel(level);
                    setIsLevelModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.objectiveItemText,
                      selectedLevel === level && styles.selectedObjectiveItemText
                    ]}
                  >
                    {level}
                  </Text>
                  {selectedLevel === level && (
                    <Ionicons name="checkmark-circle" size={24} color="#8000ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Duration Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDurationModalVisible}
        onRequestClose={() => setIsDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Duration</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsDurationModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.objectivesList}>
              {durations.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.objectiveItem,
                    selectedDuration === duration && styles.selectedObjectiveItem
                  ]}
                  onPress={() => {
                    setSelectedDuration(duration);
                    setIsDurationModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.objectiveItemText,
                      selectedDuration === duration && styles.selectedObjectiveItemText
                    ]}
                  >
                    {duration}
                  </Text>
                  {selectedDuration === duration && (
                    <Ionicons name="checkmark-circle" size={24} color="#8000ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBarSpace: {
    height: StatusBar.currentHeight || 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mainScrollView: {
    flex: 1,
  },
  plansContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  planContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  planGradient: {
    borderRadius: 16,
    overflow: 'visible',
  },
  planHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  coachDetails: {
    flex: 1,
  },
  nameRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rating: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },
  planDetailsContainer: {
    padding: 16,
  },
  planDetails: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8000ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  viewDetailsText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 6,
  },
  priceBadge: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  priceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  planPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  shadowContainer: {
    margin: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  headerContainer: {
    padding: 16,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  filterButtonContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  filtersContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondFiltersRow: {
    marginTop: 8,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  objectiveFilterButton: {
    flex: 1,
    marginRight: 6,
  },
  typeFilterButton: {
    flex: 1,
    marginLeft: 6,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 6,
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 6,
  },
  objectivesList: {
    marginTop: 16,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedObjectiveItem: {
    backgroundColor: '#f8f0ff',
  },
  objectiveItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedObjectiveItemText: {
    fontWeight: '600',
    color: '#8000ff',
  },
  noPlansContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPlansText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#8000ff',
    borderRadius: 8,
  },
  resetFilterText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resetButtonText: {
    color: '#8000ff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
});