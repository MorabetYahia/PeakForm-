import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, StatusBar, RefreshControl, Platform, SafeAreaView, useWindowDimensions, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import supabase from '../lib/supabase';

type PlanDetails = {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  price: number;
  description: string;
  coach_name: string;
  coach_image: string;
  purchase_date: string;
  expiration_date: string;
  plan_duration: string;
  level: string;
  status: 'active' | 'expired';
};

type NutritionSchedule = {
  id: string;
  day: number;
  meal_type: string;
  food_item_id: string;
  quantity: number;
  food_name?: string;
  calories?: number;
  unit?: string;
};

// Add this helper function for grouping nutrition schedule by day and meal type
const groupNutritionByDay = (nutrition: NutritionSchedule[]) => {
  const grouped: { [key: number]: { [mealType: string]: NutritionSchedule[] } } = {};
  
  // Define meal type order for sorting
  const mealTypeOrder = {
    'Breakfast': 1,
    'Lunch': 2, 
    'Dinner': 3,
    'Snack': 4
  };
  
  // Group items by day
  nutrition.forEach(meal => {
    if (!grouped[meal.day]) {
      grouped[meal.day] = {};
    }
    
    if (!grouped[meal.day][meal.meal_type]) {
      grouped[meal.day][meal.meal_type] = [];
    }
    
    grouped[meal.day][meal.meal_type].push(meal);
  });
  
  return grouped;
};

export default function MyNutritionPlan() {
  const { width: screenWidth } = useWindowDimensions();
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [nutritionSchedule, setNutritionSchedule] = useState<NutritionSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedDays, setExpandedDays] = useState<{ [key: number]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user's client ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;

      // Get the client's active nutrition plans
      const { data: clientPlans } = await supabase
        .from('client_plan')
        .select(`
          *,
          plan:plan_id (
            type
          )
        `)
        .eq('client_id', clientData.client_id)
        .order('purchase_date', { ascending: false });

      if (!clientPlans || clientPlans.length === 0) {
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Filter for nutrition plans only
      const nutritionPlan = clientPlans.find(cp => 
        cp.plan?.type === 'nutrition' || cp.plan?.type === 'fitness & nutrition'
      );

      if (!nutritionPlan) {
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Check if plan is expired
      const isExpired = new Date(nutritionPlan.expiration_date) < new Date();

      // Get the plan details with coach information
      const { data: planData } = await supabase
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
        .eq('plan_id', nutritionPlan.plan_id)
        .single();

      if (planData && planData.coach?.user) {
        setPlan({
          plan_id: nutritionPlan.plan_id,
          title: planData.title,
          objective: planData.objective,
          type: planData.type,
          price: planData.price,
          description: planData.description,
          coach_name: planData.coach.user.Full_name,
          coach_image: planData.coach.user.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
          purchase_date: nutritionPlan.purchase_date,
          expiration_date: nutritionPlan.expiration_date,
          plan_duration: planData.plan_duration,
          level: planData.level,
          status: isExpired ? 'expired' : 'active'
        });

        // Fetch nutrition schedule if it's a nutrition plan
        if (planData.type === 'nutrition' || planData.type === 'fitness & nutrition') {
          const { data: scheduleData } = await supabase
            .from('client_nutrition_schedule')
            .select(`
              *,
              food_item:food_item_id (
                id,
                name,
                calories_per_unit,
                unit
              )
            `)
            .eq('client_plan_id', nutritionPlan.client_plan_id)
            .order('day', { ascending: true });

          if (scheduleData) {
            // Transform data to include food name and calculated calories
            const transformedData = scheduleData.map((item: any) => ({
              id: item.id,
              day: item.day,
              meal_type: item.meal_type,
              food_item_id: item.food_item_id,
              quantity: item.quantity,
              food_name: item.food_item?.name || 'Unknown food',
              calories: (item.food_item?.calories_per_unit || 0) * item.quantity,
              unit: item.food_item?.unit || 'serving'
            }));
            setNutritionSchedule(transformedData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRemovePlan = async () => {
    Alert.alert(
      "Remove Plan",
      "Are you sure you want to remove this plan? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Get current user's client ID
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { data: clientData } = await supabase
                .from('client')
                .select('client_id')
                .eq('user_id', user.id)
                .single();

              if (!clientData) return;

              // Get the client_plan_id first
              const { data: clientPlanData, error: clientPlanError } = await supabase
                .from('client_plan')
                .select('client_plan_id')
                .eq('client_id', clientData.client_id)
                .eq('plan_id', plan?.plan_id)
                .single();

              if (clientPlanError) {
                console.error('Error fetching client plan:', clientPlanError);
                Alert.alert("Error", "Failed to remove the plan. Please try again.");
                return;
              }

              // Delete the specific client's nutrition plan from client_plan table
              const { error } = await supabase
                .from('client_plan')
                .delete()
                .eq('client_id', clientData.client_id)
                .eq('plan_id', plan?.plan_id);

              if (error) {
                console.error('Error removing plan:', error);
                Alert.alert("Error", "Failed to remove the plan. Please try again.");
                return;
              }

              // Navigate back to suivi page
              router.push('/(tabsclient)/suivi');
            } catch (error) {
              console.error('Error in handleRemovePlan:', error);
              Alert.alert("Error", "An unexpected error occurred. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const groupedNutrition = groupNutritionByDay(nutritionSchedule);

  const toggleDayExpansion = (day: number) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8000ff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.noPlanContainer}>
            <Ionicons name="nutrition-outline" size={64} color="#8000ff" />
            <Text style={styles.noPlanTitle}>No Nutrition Plan</Text>
            <Text style={styles.noPlanText}>
              You don't have an active nutrition plan at the moment. Purchase a nutrition plan to start your health journey!
            </Text>
            <TouchableOpacity 
              style={styles.browsePlansButton}
              onPress={() => router.push('/(tabsclient)/plans')}
            >
              <Text style={styles.browsePlansText}>Browse Nutrition Plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8000ff']}
            tintColor="#8000ff"
          />
        }
      >
        {/* Coach Section */}
        <View style={styles.coachSection}>
          <View style={styles.coachCard}>
            <Image 
              source={{ uri: plan?.coach_image }} 
              style={styles.coachImage} 
              onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
            />
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{plan?.coach_name}</Text>
              <Text style={styles.coachTitle}>Your Nutrition Coach</Text>
              <View style={styles.coachStatus}>
                <View style={[styles.statusDot, { backgroundColor: plan?.status === 'active' ? '#4CAF50' : '#F44336' }]} />
                <Text style={styles.statusText}>{plan?.status === 'active' ? 'Active' : 'Expired'}</Text>
              </View>
            </View>
          </View>

          {/* Plan Details - Made responsive */}
          <View style={styles.detailsGrid}>
            <View style={[styles.detailItem, { width: screenWidth < 380 ? '48%' : '48%' }]}>
              <Ionicons name="nutrition-outline" size={20} color="#8000ff" />
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{plan?.type}</Text>
            </View>
            <View style={[styles.detailItem, { width: screenWidth < 380 ? '48%' : '48%' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#8000ff" />
              <Text style={styles.detailLabel}>Level</Text>
              <Text style={styles.detailValue}>{plan?.level}</Text>
            </View>
            <View style={[styles.detailItem, { width: screenWidth < 380 ? '48%' : '48%' }]}>
              <Ionicons name="time-outline" size={20} color="#8000ff" />
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{plan?.plan_duration}</Text>
            </View>
            <View style={[styles.detailItem, { width: screenWidth < 380 ? '48%' : '48%' }]}>
              <Ionicons name="flag-outline" size={20} color="#8000ff" />
              <Text style={styles.detailLabel}>Objective</Text>
              <Text style={styles.detailValue}>{plan?.objective}</Text>
            </View>
          </View>
        </View>

        {/* Plan Description with Read More */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Your Plan</Text>
          <View style={styles.descriptionCard}>
            <Text 
              style={styles.description}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {plan?.description || 'No description available'}
            </Text>
            {plan?.description && plan.description.length > 150 && (
              <TouchableOpacity 
                style={styles.readMoreButton}
                onPress={() => setShowFullDescription(!showFullDescription)}
              >
                <Text style={styles.readMoreText}>
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nutrition Schedule */}
        {(plan?.type === 'nutrition' || plan?.type === 'fitness & nutrition') && Object.keys(groupedNutrition).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Schedule</Text>
            <View style={styles.workoutCard}>
              {Object.entries(groupedNutrition).map(([day, mealsByType]) => {
                const dayNumber = parseInt(day);
                const isExpanded = expandedDays[dayNumber] || false;
                
                // Get all meal types for this day sorted in correct order
                const mealTypes = Object.keys(mealsByType).sort((a, b) => {
                  const orderA = a === 'Breakfast' ? 1 : a === 'Lunch' ? 2 : a === 'Dinner' ? 3 : 4;
                  const orderB = b === 'Breakfast' ? 1 : b === 'Lunch' ? 2 : b === 'Dinner' ? 3 : 4;
                  return orderA - orderB;
                });

                // Count total meals to determine if "show more" is needed
                let totalMeals = 0;
                mealTypes.forEach(type => totalMeals += mealsByType[type].length);
                
                // Limit visible meal types for collapsed view
                const visibleMealTypes = isExpanded ? mealTypes : mealTypes.slice(0, 2);
                const hasMoreMealTypes = mealTypes.length > 2;

                return (
                  <View key={day} style={styles.workoutDayGroup}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayText}>Day {day}</Text>
                    </View>
                    
                    {visibleMealTypes.map(mealType => (
                      <View key={`${day}-${mealType}`} style={styles.mealTypeGroup}>
                        <Text style={styles.mealTypeHeader}>{mealType}</Text>
                        
                        {mealsByType[mealType].map((meal, index) => (
                          <View key={index} style={styles.workoutItem}>
                            <View style={styles.exerciseInfo}>
                              <Text style={styles.exerciseName}>{meal.food_name}</Text>
                              <View style={styles.exerciseDetails}>
                                <View style={styles.detailPill}>
                                  <Ionicons name="restaurant-outline" size={14} color="#8000ff" />
                                  <Text style={styles.detailText}>
                                    {typeof meal.unit === 'string' ? 
                                      (meal.unit.startsWith('1') && meal.unit.length > 1 ? 
                                        `${meal.quantity}${meal.unit.substring(1)}` : 
                                        isNaN(Number(meal.unit)) ? 
                                          `${meal.quantity}${meal.unit}` : 
                                          `${meal.quantity * Number(meal.unit)}`) :
                                      `${meal.quantity} servings`}
                                  </Text>
                                </View>
                                <View style={styles.detailPill}>
                                  <Ionicons name="flame-outline" size={14} color="#8000ff" />
                                  <Text style={styles.detailText}>{meal.calories} cal</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                    
                    {hasMoreMealTypes && (
                      <TouchableOpacity 
                        style={styles.showMoreButton}
                        onPress={() => toggleDayExpansion(dayNumber)}
                      >
                        <Text style={styles.showMoreText}>
                          {isExpanded ? 'Show Less' : `Show More Meals`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Subscription Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionRow}>
              <Ionicons name="calendar-outline" size={24} color="#8000ff" />
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionLabel}>Purchase Date</Text>
                <Text style={styles.subscriptionValue}>
                  {plan?.purchase_date ? new Date(plan.purchase_date).toLocaleDateString() : '-'}
                </Text>
              </View>
            </View>
            <View style={styles.subscriptionRow}>
              <Ionicons name="hourglass-outline" size={24} color="#8000ff" />
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionLabel}>Expiration Date</Text>
                <Text style={styles.subscriptionValue}>
                  {plan?.expiration_date ? new Date(plan.expiration_date).toLocaleDateString() : '-'}
                </Text>
              </View>
            </View>
            <View style={styles.subscriptionRow}>
              <Ionicons name="cash-outline" size={24} color="#8000ff" />
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionLabel}>Price</Text>
                <Text style={styles.subscriptionValue}>${plan?.price || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Remove Plan Button */}
        <TouchableOpacity 
          style={[styles.removeButton, plan?.status === 'expired' && styles.expiredButton]}
          onPress={handleRemovePlan}
        >
          <Text style={styles.removeButtonText}>
            {plan?.status === 'expired' ? 'Remove Expired Plan' : 'Remove Plan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const itemWidth = (width - 52) / 2; // Calculate based on screen width, padding, and gap

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  coachSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coachImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#8000ff',
    backgroundColor: '#f0e6ff', // Placeholder background while loading
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  coachTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  coachStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 2,
  },
  detailItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
    width: itemWidth,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutDayGroup: {
    marginBottom: 12,
  },
  dayHeader: {
    backgroundColor: '#f0e6ff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8000ff',
  },
  workoutItem: {
    marginBottom: 8,
  },
  mealTypeGroup: {
    marginBottom: 12,
  },
  mealTypeHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8000ff',
    marginBottom: 8,
    marginLeft: 4,
  },
  exerciseInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subscriptionInfo: {
    marginLeft: 16,
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 30 : 20,
    alignItems: 'center',
  },
  expiredButton: {
    backgroundColor: '#9E9E9E',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  readMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  readMoreText: {
    color: '#8000ff',
    fontSize: 14,
    fontWeight: '600',
  },
  showMoreButton: {
    backgroundColor: '#f0e6ff',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#8000ff',
    fontSize: 14,
    fontWeight: '600',
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  noPlanTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  noPlanText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  browsePlansButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browsePlansText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 