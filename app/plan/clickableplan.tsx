import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, StatusBar, Platform, ActivityIndicator, Pressable, Modal, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import supabase from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const { width } = Dimensions.get('window');

interface Plan {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  price: number;
  description: string;
  rating: number | null;
  status: string;
  created_at: string;
  coach_id: string;
  coach_name: string;
  coach_image: string;
  plan_duration: string;
  level: string;
}

interface FitnessSchedule {
  day: number;
  exercise: string;
  number_of_sets: number;
  number_of_repetition: string;
}

interface FoodItem {
  id: string;
  name: string;
  calories_per_unit: number;
  unit: string;
}

interface NutritionScheduleItem {
  id: string;
  day: number;
  meal_type: string;
  quantity: number;
  food_items: FoodItem;
}

interface NutritionSchedule {
  id: string;
  day: number;
  meal_type: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
}

export default function ClickablePlan() {
  const { id } = useLocalSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [fitnessSchedule, setFitnessSchedule] = useState<FitnessSchedule[]>([]);
  const [nutritionSchedule, setNutritionSchedule] = useState<NutritionSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      fetchPlanDetails();
    }
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlanDetails();
    setRefreshing(false);
  };

  const fetchPlanDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch plan details with coach information
      const { data: planData, error: planError } = await supabase
        .from('plan')
        .select(`
          *,
          coach:coach_id (
            user:user_id (
              Full_name,
              profile_image
            )
          )
        `)
        .eq('plan_id', id)
        .single();

      if (planError) {
        console.error('Error fetching plan:', planError);
        setIsLoading(false);
        return;
      }

      console.log('Plan Data:', planData);
      console.log('Plan Type:', planData.type);
      console.log('Plan ID:', planData.plan_id);

      // Transform the data to match our Plan interface
      const transformedPlan = {
        ...planData,
        coach_name: planData.coach.user.Full_name,
        coach_image: planData.coach.user.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
      };

      setPlan(transformedPlan);

      // If it's a fitness plan, fetch the fitness schedule
      if (planData.type === 'fitness' || planData.type === 'fitness & nutrition') {
        console.log('Fetching fitness schedule for plan_id:', id);
        
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('fitness_schedule')
          .select('*')
          .eq('plan_id', id)
          .order('day', { ascending: true });

        console.log('Raw Fitness Schedule Data:', scheduleData);
        console.log('Fitness Schedule Error:', scheduleError);

        if (scheduleError) {
          console.error('Error fetching fitness schedule:', scheduleError);
        } else {
          if (scheduleData && scheduleData.length > 0) {
            console.log('Setting fitness schedule with data:', scheduleData);
            setFitnessSchedule(scheduleData);
          } else {
            console.log('No fitness schedule data found for plan_id:', id);
            setFitnessSchedule([]);
          }
        }
      }

      // If it's a nutrition plan, fetch the nutrition schedule
      if (planData.type === 'nutrition' || planData.type === 'fitness & nutrition') {
        const { data: nutritionData, error: nutritionError } = await supabase
          .from('nutrition_schedule')
          .select(`
            id,
            day,
            meal_type,
            quantity,
            food_items (
              id,
              name,
              calories_per_unit,
              unit
            )
          `)
          .eq('plan_id', id)
          .order('day', { ascending: true })
          .order('meal_type', { ascending: true });

        console.log('Nutrition Schedule Data:', nutritionData);
        console.log('Nutrition Schedule Error:', nutritionError);

        if (nutritionError) {
          console.error('Error fetching nutrition schedule:', nutritionError);
        } else if (nutritionData) {
          // Transform the data to match our NutritionSchedule interface
          const transformedNutrition = nutritionData.map(item => {
            const foodItem = item.food_items as unknown as FoodItem;
            return {
              id: item.id,
              day: item.day,
              meal_type: item.meal_type,
              food_name: foodItem?.name || 'Unknown Food',
              quantity: item.quantity,
              unit: foodItem?.unit || 'serving',
              calories: item.quantity * (foodItem?.calories_per_unit || 0)
            };
          });
          
          setNutritionSchedule(transformedNutrition);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchPlanDetails:', error);
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No user found. Please log in again.');
        setIsPurchasing(false);
        return;
      }

      // Get the client's ID
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        Alert.alert('Error', 'Error fetching client data. Please try again later.');
        console.error('Error fetching client data:', clientError);
        setIsPurchasing(false);
        return;
      }

      // Check for existing active plans of the same type
      const now = new Date().toISOString();
      const { data: existingPlans, error: existingPlansError } = await supabase
        .from('client_plan')
        .select(`
          plan_id,
          plan:plan_id (
            type
          )
        `)
        .eq('client_id', clientData.client_id)
        .gt('expiration_date', now);

      if (existingPlansError) {
        Alert.alert('Error', 'Error checking existing plans. Please try again later.');
        console.error('Error checking existing plans:', existingPlansError);
        setIsPurchasing(false);
        return;
      }

      // Check if user already has an active plan of the same type
      if (existingPlans && existingPlans.length > 0) {
        const hasActivePlanOfSameType = existingPlans.some(existingPlan => {
          // Safely access the type property with proper type assertion
          const planType = existingPlan.plan ? (existingPlan.plan as any).type : null;
          
          // For a fitness plan
          if (plan?.type === 'fitness' && 
             (planType === 'fitness' || planType === 'fitness & nutrition')) {
            return true;
          }
          
          // For a nutrition plan
          if (plan?.type === 'nutrition' && 
             (planType === 'nutrition' || planType === 'fitness & nutrition')) {
            return true;
          }
          
          // For a combined plan
          if (plan?.type === 'fitness & nutrition' && 
             (planType === 'fitness' || planType === 'nutrition' || planType === 'fitness & nutrition')) {
            return true;
          }
          
          return false;
        });

        if (hasActivePlanOfSameType) {
          Alert.alert(
            'Plan Already Active', 
            'You already have an active plan of this type. Please wait until it expires or cancel it before purchasing another one.',
            [{ text: 'OK' }]
          );
          setIsPurchasing(false);
          return;
        }
      }

      // Calculate expiration date based on plan duration
      const duration = plan?.plan_duration || '';
      const expirationDate = new Date();
      
      // Parse the duration string to get the number and unit
      const durationMatch = duration.match(/(\d+)\s*(month|week|day)s?/i);
      if (durationMatch) {
        const number = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        
        // Create a new date object to avoid modifying the original
        const newDate = new Date(expirationDate);
        
        switch (unit) {
          case 'month':
            // Handle month addition properly
            newDate.setMonth(newDate.getMonth() + number);
            // If the new month has fewer days than the original date, adjust to the last day of the month
            if (newDate.getDate() !== expirationDate.getDate()) {
              newDate.setDate(0); // Set to last day of previous month
            }
            break;
          case 'week':
            // Add weeks in days to avoid timezone issues
            newDate.setDate(newDate.getDate() + (number * 7));
            break;
          case 'day':
            newDate.setDate(newDate.getDate() + number);
            break;
        }
        
        // Set the time to end of day (23:59:59)
        newDate.setHours(23, 59, 59, 999);
        expirationDate.setTime(newDate.getTime());
      } else {
        // Default to 1 month if duration format is invalid
        const newDate = new Date(expirationDate);
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setHours(23, 59, 59, 999);
        expirationDate.setTime(newDate.getTime());
      }

      // Generate a new UUID for client_plan_id
      const clientPlanId = uuidv4();

      // Create client_plan entry
      const { error: purchaseError } = await supabase
        .from('client_plan')
        .insert({
          client_plan_id: clientPlanId,
          client_id: clientData.client_id,
          plan_id: id,
          purchase_date: new Date().toISOString(),
          expiration_date: expirationDate.toISOString()
        });

      if (purchaseError) {
        Alert.alert('Error', 'Error creating client plan. Please try again later.');
        console.error('Error creating client plan:', purchaseError);
        setIsPurchasing(false);
        return;
      }

      // Get the plan type and coach_id
      const { data: planData, error: planError } = await supabase
        .from('plan')
        .select('type, coach_id')
        .eq('plan_id', id)
        .single();

      if (planError) {
        console.error('Error fetching plan details:', planError);
        Alert.alert('Error', 'Error setting up your plan. Please contact support.');
        setIsPurchasing(false);
        return;
      }

      // Copy fitness schedule if applicable
      if (planData.type === 'fitness' || planData.type === 'fitness & nutrition') {
        const { data: fitnessSchedule, error: fitnessError } = await supabase
          .from('fitness_schedule')
          .select('*')
          .eq('plan_id', id);

        if (fitnessError) {
          console.error('Error fetching fitness schedule:', fitnessError);
        } else if (fitnessSchedule && fitnessSchedule.length > 0) {
          const { error: insertError } = await supabase
            .from('client_fitness_schedule')
            .insert(
              fitnessSchedule.map(schedule => ({
                day: schedule.day,
                exercise: schedule.exercise,
                number_of_sets: schedule.number_of_sets,
                number_of_repetition: schedule.number_of_repetition,
                coach_id: planData.coach_id,
                plan_id: id,
                client_plan_id: clientPlanId
              }))
            );

          if (insertError) {
            console.error('Error copying fitness schedule:', insertError);
          }
        }
      }

      // Copy nutrition schedule if applicable
      if (planData.type === 'nutrition' || planData.type === 'fitness & nutrition') {
        const { data: nutritionSchedule, error: nutritionError } = await supabase
          .from('nutrition_schedule')
          .select('*')
          .eq('plan_id', id);

        if (nutritionError) {
          console.error('Error fetching nutrition schedule:', nutritionError);
        } else if (nutritionSchedule && nutritionSchedule.length > 0) {
          const { error: insertError } = await supabase
            .from('client_nutrition_schedule')
            .insert(
              nutritionSchedule.map(schedule => ({
                day: schedule.day,
                meal_type: schedule.meal_type,
                food_item_id: schedule.food_item_id,
                quantity: schedule.quantity,
                coach_id: planData.coach_id,
                plan_id: id,
                client_plan_id: clientPlanId
              }))
            );

          if (insertError) {
            console.error('Error copying nutrition schedule:', insertError);
          }
        }
      }

      // Success - redirect to suivi page
      Alert.alert(
        'Success!', 
        'You have successfully purchased this plan.',
        [{ 
          text: 'OK', 
          onPress: () => router.push('/(tabsclient)/suivi') 
        }]
      );
      
    } catch (error) {
      console.error('Error in handlePurchase:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8000ff" />
          <Text style={styles.loadingText}>Loading plan details...</Text>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plan not found</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8000ff']}
              tintColor="#8000ff"
            />
          }
        >
          <LinearGradient
            colors={['#f8f9fa', '#ffffff']}
            style={styles.gradient}
          >
            {/* Back Button */}
            <View style={styles.backButtonContainer}>
              <Pressable 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </Pressable>
            </View>

            {/* Coach Info - Centered */}
            <View style={styles.centeredCoachInfo}>
              <Image 
                source={{ uri: plan.coach_image }} 
                style={styles.coachImage}
              />
              <Text style={styles.coachName}>{plan.coach_name}</Text>
              {plan.rating && (
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>{plan.rating}</Text>
                </View>
              )}
            </View>

            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.title}</Text>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>${plan.price}</Text>
                </View>
              </View>
            </View>

            {/* Plan Overview Cards */}
            <View style={styles.overviewContainer}>
              <View style={styles.overviewCard}>
                <Ionicons name="barbell-outline" size={24} color="#8000ff" />
                <View style={styles.overviewTextContainer}>
                  <Text style={styles.overviewLabel}>Type</Text>
                  <Text style={styles.overviewValue}>{plan.type}</Text>
                </View>
              </View>
              <View style={styles.overviewCard}>
                <Ionicons name="trending-up-outline" size={24} color="#8000ff" />
                <View style={styles.overviewTextContainer}>
                  <Text style={styles.overviewLabel}>Level</Text>
                  <Text style={styles.overviewValue}>{plan.level}</Text>
                </View>
              </View>
              <View style={styles.overviewCard}>
                <Ionicons name="time-outline" size={24} color="#8000ff" />
                <View style={styles.overviewTextContainer}>
                  <Text style={styles.overviewLabel}>Duration</Text>
                  <Text style={styles.overviewValue}>{plan.plan_duration}</Text>
                </View>
              </View>
            </View>

            {/* Plan Status and Details */}
            <View style={styles.detailsSection}>
              <View style={[
                styles.statusContainer,
                plan.status === 'public' ? styles.publicStatus : styles.privateStatus
              ]}>
                <Text style={[
                  styles.statusText,
                  plan.status === 'public' ? styles.publicText : styles.privateText
                ]}>
                  Status: {plan.status}
                </Text>
              </View>

              {/* Redesigned objective section - removed price card */}
              <View style={styles.keyDetailsContainer}>
                <Pressable 
                  style={styles.objectiveCard} 
                  onPress={() => setShowObjectiveModal(true)}
                >
                  <View style={styles.objectiveIconContainer}>
                    <Ionicons name="flag-outline" size={24} color="#fff" />
                  </View>
                  <View style={styles.objectiveDetails}>
                    <Text style={styles.objectiveLabel}>Objective</Text>
                    <Text style={styles.objectiveValue} numberOfLines={2} ellipsizeMode="tail">
                      {plan.objective}
                    </Text>
                    <Text style={styles.viewMoreText}>View More</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={24} color="#8000ff" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <View style={styles.descriptionContainer}>
                <Text 
                  style={styles.descriptionText}
                  numberOfLines={showFullDescription ? undefined : 3}
                  ellipsizeMode="tail"
                >
                  {plan.description}
                </Text>
                {plan.description.length > 150 && (
                  <Pressable 
                    style={styles.readMoreButton}
                    onPress={() => setShowFullDescription(!showFullDescription)}
                  >
                    <Text style={styles.readMoreText}>
                      {showFullDescription ? 'Show Less' : 'Read More'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Workout Schedule */}
            {(plan.type === 'fitness' || plan.type === 'fitness & nutrition') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barbell-outline" size={24} color="#8000ff" />
                  <Text style={styles.sectionTitle}>Workout Schedule</Text>
                </View>
                {fitnessSchedule && fitnessSchedule.length > 0 ? (
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.headerCell, { flex: 0.5 }]}>Day</Text>
                      <Text style={[styles.headerCell, { flex: 2 }]}>Exercise</Text>
                      <Text style={[styles.headerCell, { flex: 1 }]}>Sets</Text>
                      <Text style={[styles.headerCell, { flex: 1 }]}>Reps</Text>
                    </View>
                    {Array.from(new Set(fitnessSchedule.map(item => item.day))).map(day => {
                      const dayExercises = fitnessSchedule.filter(ex => ex.day === day);
                      const isExpanded = expandedDays.includes(day);
                      const exercisesToShow = isExpanded ? dayExercises : dayExercises.slice(0, 1);
                      
                      return (
                        <React.Fragment key={day}>
                          {exercisesToShow.map((exercise, index) => (
                            <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                              <Text style={[styles.tableCell, { flex: 0.5, fontWeight: '600' }]}>Day {exercise.day}</Text>
                              <Text style={[styles.tableCell, { flex: 2 }]}>{exercise.exercise}</Text>
                              <Text style={[styles.tableCell, { flex: 1 }]}>{exercise.number_of_sets}</Text>
                              <Text style={[styles.tableCell, { flex: 1 }]}>{exercise.number_of_repetition}</Text>
                            </View>
                          ))}
                          {dayExercises.length > 1 && (
                            <TouchableOpacity
                              style={styles.showMoreButton}
                              onPress={() => {
                                if (isExpanded) {
                                  setExpandedDays(expandedDays.filter(d => d !== day));
                                } else {
                                  setExpandedDays([...expandedDays, day]);
                                }
                              }}
                            >
                              <Text style={styles.showMoreText}>
                                {isExpanded ? 'Show Less' : `Show ${dayExercises.length - 1} More`}
                              </Text>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#8000ff"
                                style={styles.showMoreIcon}
                              />
                            </TouchableOpacity>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>No workout schedule available</Text>
                  </View>
                )}
              </View>
            )}

            {/* Nutrition Schedule */}
            {(plan.type === 'nutrition' || plan.type === 'fitness & nutrition') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="restaurant-outline" size={24} color="#8000ff" />
                  <Text style={styles.sectionTitle}>Nutrition Plan</Text>
                </View>
                
                {nutritionSchedule.length > 0 ? (
                  <View style={styles.nutritionContainer}>
                    {Array.from(new Set(nutritionSchedule.map(item => item.day))).map(day => (
                      <View key={day} style={styles.nutritionDayContainer}>
                        <View style={styles.nutritionDayHeader}>
                          <Ionicons name="calendar-outline" size={20} color="#8000ff" />
                          <Text style={styles.nutritionDayTitle}>Day {day}</Text>
                        </View>
                        {Array.from(new Set(nutritionSchedule.filter(item => item.day === day).map(item => item.meal_type))).map(mealType => (
                          <View key={`${day}-${mealType}`} style={styles.mealContainer}>
                            <View style={styles.mealHeader}>
                              <Ionicons name="time-outline" size={18} color="#8000ff" />
                              <Text style={styles.mealTitle}>{mealType}</Text>
                            </View>
                            <View style={styles.mealItemsContainer}>
                              {nutritionSchedule
                                .filter(item => item.day === day && item.meal_type === mealType)
                                .map((item, index) => (
                                  <View key={item.id} style={[styles.mealItem, index % 2 === 0 ? styles.evenMealItem : styles.oddMealItem]}>
                                    <View style={styles.mealItemContent}>
                                      <Ionicons name="nutrition-outline" size={20} color="#8000ff" style={styles.mealItemIcon} />
                                      <View style={styles.mealItemDetails}>
                                        <Text style={styles.foodName}>{item.food_name}</Text>
                                        <Text style={styles.foodQuantity}>{item.quantity} {item.unit}</Text>
                                      </View>
                                    </View>
                                    <View style={styles.caloriesContainer}>
                                      <Text style={styles.caloriesText}>{item.calories} cal</Text>
                                    </View>
                                  </View>
                                ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>No nutrition schedule available</Text>
                  </View>
                )}
              </View>
            )}

            {/* Plan Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Information</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Created</Text>
                  <Text style={styles.infoValue}>
                    {new Date(plan.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Rating</Text>
                  <View style={styles.ratingContainer}>
                    <FontAwesome name="star" size={14} color="#FFD700" />
                    <Text style={styles.rating}>{plan.rating || 'Not rated'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>

        {/* Objective Modal */}
        <Modal
          visible={showObjectiveModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowObjectiveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Objective</Text>
                <Pressable onPress={() => setShowObjectiveModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalText}>{plan?.objective}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
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
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 16,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  centeredCoachInfo: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  header: {
    marginBottom: 20,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 3,
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
  coachName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  priceBadge: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  priceText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  keyDetailsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  objectiveCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  objectiveIconContainer: {
    backgroundColor: '#00c853',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  objectiveDetails: {
    flex: 1,
  },
  objectiveLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  objectiveValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  viewMoreText: {
    color: '#8000ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  readMoreText: {
    color: '#8000ff',
    fontSize: 14,
    fontWeight: '600',
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  workoutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  workoutDetailText: {
    fontSize: 12,
    color: '#666',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8000ff',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    color: '#333',
    textAlign: 'center',
    fontSize: 14,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewTextContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  publicStatus: {
    backgroundColor: '#E8F5E9',
  },
  privateStatus: {
    backgroundColor: '#FFEBEE',
  },
  publicText: {
    color: '#4CAF50',
  },
  privateText: {
    color: '#D32F2F',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    maxHeight: '90%',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  nutritionContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  nutritionDayContainer: {
    marginBottom: 24,
  },
  nutritionDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#8000ff',
    paddingBottom: 8,
  },
  nutritionDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  mealContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8000ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  mealItemsContainer: {
    padding: 8,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  evenMealItem: {
    backgroundColor: '#fff',
  },
  oddMealItem: {
    backgroundColor: '#f8f9fa',
  },
  mealItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealItemIcon: {
    marginRight: 12,
  },
  mealItemDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  foodQuantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  caloriesContainer: {
    backgroundColor: '#fff3f3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  buyNowContainer: {
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  buyNowButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  showMoreText: {
    color: '#8000ff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  showMoreIcon: {
    marginLeft: 4,
  },
});
