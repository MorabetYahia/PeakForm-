import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

interface MealItem {
  name: string;
  quantity: number;
  calories: number;
  unit: string;
  day: number;
  meal_type: string;
  isExpanded?: boolean;
  plan_id?: string;
  food_item_id?: string;
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
  food_item_id: string;
  quantity: number;
  created_at: string;
  coach_id: string;
  plan_id: string;
  food_item?: FoodItem;
}

interface Plan {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  coach_id: string;
  plan_duration: string;
}

export default function NutritionSchedule() {
  const [mealProgram, setMealProgram] = useState<MealItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [showDaysList, setShowDaysList] = useState(true);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [planDuration, setPlanDuration] = useState<number>(7); // Default to 7 days
  const [currentPage, setCurrentPage] = useState(0); // Add pagination
  const daysPerPage = 7; // Show 7 days per page

  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // Check if there's a plan_id in the URL params
  useEffect(() => {
    if (params.plan_id) {
      setSelectedPlanId(params.plan_id as string);
      // If auto_select is true, scroll to the selected plan
      if (params.auto_select === 'true') {
        setTimeout(() => {
          const selectedPlanIndex = plans.findIndex(p => p.plan_id === params.plan_id);
          if (selectedPlanIndex !== -1) {
            scrollViewRef.current?.scrollTo({
              x: selectedPlanIndex * 160, // Adjust this value based on your plan card width
              animated: true
            });
          }
        }, 500); // Small delay to ensure the plans are loaded
      }
    }
  }, [params.plan_id, params.auto_select, plans, setSelectedPlanId]);

  // Update plan duration when selected plan changes
  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const selectedPlan = plans.find(plan => plan.plan_id === selectedPlanId);
      if (selectedPlan) {
        // Parse the duration from different formats
        const duration = selectedPlan.plan_duration.toLowerCase();
        
        if (duration.includes('day')) {
          // Format: "X days"
          const durationMatch = duration.match(/(\d+)/);
          if (durationMatch && durationMatch[1]) {
            setPlanDuration(parseInt(durationMatch[1], 10));
          } else {
            setPlanDuration(7); // Default
          }
        } else if (duration.includes('month')) {
          // For months, map to specific day values
          const durationMatch = duration.match(/(\d+)/);
          if (durationMatch && durationMatch[1]) {
            const months = parseInt(durationMatch[1], 10);
            if (months === 1) {
              setPlanDuration(28); // 1 month = 28 days
            } else if (months === 2) {
              setPlanDuration(28); // Keep as 28 days
            } else if (months === 3) {
              setPlanDuration(28); // Keep as 28 days
            } else {
              setPlanDuration(28); // Default for any month value
            }
          } else {
            setPlanDuration(28); // Default for unspecified month value
          }
        } else if (duration.includes('week')) {
          // Format: "X week" or "X weeks"
          const durationMatch = duration.match(/(\d+)/);
          if (durationMatch && durationMatch[1]) {
            const weeks = parseInt(durationMatch[1], 10);
            setPlanDuration(weeks * 7);
          } else {
            setPlanDuration(7); // Default for 1 week
          }
        } else {
          // If format is not recognized, try to extract just the number
          const durationMatch = duration.match(/(\d+)/);
          if (durationMatch && durationMatch[1]) {
            const days = parseInt(durationMatch[1], 10);
            // Only allow 7, 14, or 28 days
            if (days === 7 || days === 14) {
              setPlanDuration(days);
            } else {
              setPlanDuration(28);
            }
          } else {
            setPlanDuration(7); // Default fallback
          }
        }
        
        // Reset to first page when plan changes
        setCurrentPage(0);
      }
    }
  }, [selectedPlanId, plans]);

  useFocusEffect(
    React.useCallback(() => {
      fetchPlans();
      // Only fetch meals if we have a selected plan
      if (selectedPlanId) {
        fetchMeals(selectedPlanId);
      } else {
        setIsLoading(false);
      }
    }, [selectedPlanId])
  );

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        Alert.alert('Error', 'Please sign in to view plans');
        setIsLoadingPlans(false);
        return;
      }

      // Check if user exists in coach table
      const { data: coachData, error: coachError } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        console.error('Coach not found:', coachError);
        Alert.alert('Error', 'You must be a registered coach to view plans');
        setIsLoadingPlans(false);
        return;
      }

      // Fetch all nutrition plans by this coach
      const { data: plansData, error: plansError } = await supabase
        .from('plan')
        .select('*')
        .eq('coach_id', coachData.coach_id)
        .eq('type', 'nutrition')  // Only get plans with type "nutrition"
        .order('created_at', { ascending: false });

      if (plansError) {
        console.error('Error fetching plans:', plansError);
        Alert.alert('Error', 'Failed to fetch plans');
        setIsLoadingPlans(false);
        return;
      }

      setPlans(plansData as Plan[]);
      
      // If no plan is selected and we have plans, select the first one
      if (!selectedPlanId && plansData && plansData.length > 0) {
        setSelectedPlanId(plansData[0].plan_id);
      }
      
      setIsLoadingPlans(false);
    } catch (error) {
      console.error('Error in fetchPlans:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching plans');
      setIsLoadingPlans(false);
    }
  };

  const fetchMeals = async (planId: string) => {
    try {
      setIsLoading(true);
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        Alert.alert('Error', 'Please sign in to view nutrition schedule');
        setIsLoading(false);
        return;
      }

      // Check if user exists in coach table
      const { data: coachData, error: coachError } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        console.error('Coach not found:', coachError);
        Alert.alert('Error', 'You must be a registered coach to view nutrition schedule');
        setIsLoading(false);
        return;
      }

      console.log('Fetching nutrition schedule for plan_id:', planId);

      // Join nutrition_schedule with food_items to get food details
      const { data, error } = await supabase
        .from('nutrition_schedule')
        .select(`
          *,
          food_item:food_item_id (
            id,
            name,
            calories_per_unit,
            unit
          )
        `)
        .eq('plan_id', planId)
        .order('day', { ascending: true });

      if (error) {
        console.error('Error fetching nutrition schedule:', error);
        Alert.alert('Error', 'Failed to fetch nutrition schedule: ' + error.message);
        setIsLoading(false);
        return;
      }

      console.log('Fetched nutrition items:', data);

      if (!data || data.length === 0) {
        // If no meals found, just show empty state
        setMealProgram([]);
        setIsLoading(false);
        return;
      }

      // Transform data into MealItem format
      const formattedMeals = data.map((item: NutritionScheduleItem) => ({
        name: item.food_item?.name || 'Unknown food',
        quantity: item.quantity,
        calories: (item.food_item?.calories_per_unit || 0) * item.quantity,
        unit: item.food_item?.unit || 'serving',
        day: item.day,
        meal_type: item.meal_type,
        plan_id: item.plan_id,
        food_item_id: item.food_item_id
      }));

      setMealProgram(formattedMeals);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchMeals:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching nutrition schedule');
      setIsLoading(false);
    }
  };

  const handleDeleteMeal = async (meal: MealItem) => {
    try {
      if (!selectedPlanId) {
        Alert.alert('Error', 'No plan selected');
        return;
      }

      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to delete meals');
        return;
      }

      // Check if user exists in coach table
      const { data: coachData, error: coachError } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        Alert.alert('Error', 'You must be a registered coach to delete meals');
        return;
      }

      console.log('Starting delete process for meal:', {
        day: meal.day,
        meal_type: meal.meal_type,
        food_item_id: meal.food_item_id,
        plan_id: selectedPlanId
      });

      // First, let's check what's in the database
      const { data: existingData, error: checkError } = await supabase
        .from('nutrition_schedule')
        .select('*')
        .eq('day', meal.day)
        .eq('food_item_id', meal.food_item_id)
        .eq('meal_type', meal.meal_type)
        .eq('plan_id', selectedPlanId);

      if (checkError) {
        console.error('Error checking database:', checkError);
        Alert.alert('Error', 'Failed to check database');
        return;
      }

      console.log('Found in database:', existingData);

      if (!existingData || existingData.length === 0) {
        console.log('No matching meal found in database');
        Alert.alert('Error', 'Meal not found in database');
        return;
      }

      // Now try to delete
      const { data: deleteData, error: deleteError } = await supabase
        .from('nutrition_schedule')
        .delete()
        .eq('day', meal.day)
        .eq('food_item_id', meal.food_item_id)
        .eq('meal_type', meal.meal_type)
        .eq('plan_id', selectedPlanId)
        .select();

      if (deleteError) {
        console.error('Delete error:', deleteError);
        Alert.alert('Error', `Failed to delete: ${deleteError.message}`);
        return;
      }

      console.log('Delete result:', deleteData);

      // Update local state
      setMealProgram(prev => prev.filter(m => 
        !(m.day === meal.day && m.food_item_id === meal.food_item_id && m.meal_type === meal.meal_type)
      ));

      Alert.alert('Success', 'Meal deleted successfully');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(day => day !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const getSelectedPlanTitle = () => {
    if (!selectedPlanId || !plans.length) return "Select a Plan";
    const plan = plans.find(p => p.plan_id === selectedPlanId);
    return plan ? plan.title : "Select a Plan";
  };

  const renderPlanSelector = () => {
    if (isLoadingPlans) {
      return (
        <View style={styles.planSelectorContainer}>
          <ActivityIndicator size="small" color="#8000ff" />
          <Text style={styles.planSelectorText}>Loading plans...</Text>
        </View>
      );
    }

    if (plans.length === 0) {
      return (
        <View style={styles.planSelectorContainer}>
          <Text style={styles.planSelectorText}>No plans available</Text>
          <Pressable
            style={styles.createPlanButton}
            onPress={() => router.push('/plan/planform')}
          >
            <Text style={styles.createPlanButtonText}>Create a Plan</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.planSelectorContainer}>
        <Text style={styles.sectionTitle}>Your Plans:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plansList}
        >
          {plans.map((plan) => (
            <Pressable
              key={plan.plan_id}
              style={[
                styles.planCard,
                selectedPlanId === plan.plan_id && styles.selectedPlanCard
              ]}
              onPress={() => setSelectedPlanId(plan.plan_id)}
            >
              <Text 
                style={[
                  styles.planCardTitle,
                  selectedPlanId === plan.plan_id && styles.selectedPlanText
                ]}
                numberOfLines={1}
              >
                {plan.title}
              </Text>
              <Text 
                style={[
                  styles.planCardSubtitle,
                  selectedPlanId === plan.plan_id && styles.selectedPlanText
                ]}
                numberOfLines={1}
              >
                {plan.objective}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Helper function to render pagination controls
  const renderPaginationControls = () => {
    if (planDuration <= daysPerPage) return null;
    
    const totalPages = Math.ceil(planDuration / daysPerPage);
    
    return (
      <View style={styles.paginationControls}>
        <Pressable 
          style={({pressed}) => [
            styles.paginationButton,
            pressed && styles.buttonPressed,
            currentPage === 0 && styles.disabledButton
          ]}
          onPress={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
          disabled={currentPage === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? "#ccc" : "#8000ff"} />
          <Text style={[styles.paginationButtonText, currentPage === 0 && styles.disabledButtonText]}>Previous</Text>
        </Pressable>
        
        <Text style={styles.paginationInfo}>
          Page {currentPage + 1} of {totalPages}
        </Text>
        
        <Pressable 
          style={({pressed}) => [
            styles.paginationButton,
            pressed && styles.buttonPressed,
            currentPage >= totalPages - 1 && styles.disabledButton
          ]}
          onPress={() => currentPage < totalPages - 1 && setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          <Text style={[styles.paginationButtonText, currentPage >= totalPages - 1 && styles.disabledButtonText]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={currentPage >= totalPages - 1 ? "#ccc" : "#8000ff"} />
        </Pressable>
      </View>
    );
  };

  const renderDaysList = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#8000ff" />
          <Text style={styles.emptyStateText}>Loading nutrition schedule...</Text>
        </View>
      );
    }

    if (!selectedPlanId) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Please select a plan first</Text>
        </View>
      );
    }

    // Calculate start and end day for current page
    const startDay = currentPage * daysPerPage;
    const endDay = Math.min(startDay + daysPerPage, planDuration);
    
    return (
      <View style={styles.daysListContainer}>
        <Text style={styles.sectionTitle}>{planDuration}-Day Nutrition Schedule:</Text>
        
        {renderPaginationControls()}
        
        {Array.from({ length: endDay - startDay }, (_, index) => {
          const dayNumber = startDay + index + 1;
          const dayMeals = mealProgram.filter(meal => meal.day === dayNumber);
          
          // Group meals by meal type (breakfast, lunch, dinner, etc.)
          const mealsByType: Record<string, MealItem[]> = {};
          dayMeals.forEach(meal => {
            if (!mealsByType[meal.meal_type]) {
              mealsByType[meal.meal_type] = [];
            }
            mealsByType[meal.meal_type].push(meal);
          });

          return (
            <View key={`day-${dayNumber}`} style={styles.dayItem}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayText}>Day {dayNumber}</Text>
                <View style={styles.dayButtonsContainer}>
                  <Pressable
                    style={({pressed}) => [
                      styles.smallButton,
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => {
                      if (!selectedPlanId) {
                        Alert.alert('Error', 'Please select a plan first');
                        return;
                      }
                      setExpandedDays([dayNumber]);
                      router.push({
                        pathname: '/plan/add-meal',
                        params: { 
                          day: dayNumber,
                          plan_id: selectedPlanId
                        }
                      });
                    }}
                  >
                    <LinearGradient
                      colors={['#B721FF', '#8A2BE2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.smallGradient}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.smallButtonText}>Add Meal</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                  
                  <Pressable
                    style={({pressed}) => [
                      styles.viewButton,
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => toggleDayExpansion(dayNumber)}
                  >
                    <LinearGradient
                      colors={['#B721FF', '#8A2BE2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.smallGradient}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name={expandedDays.includes(dayNumber) ? "chevron-up" : "eye"} size={16} color="#fff" />
                        <Text style={styles.smallButtonText}>
                          {expandedDays.includes(dayNumber) ? "Hide" : "View"}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>

              {expandedDays.includes(dayNumber) && (
                <View style={styles.exercisesContainer}>
                  {Object.keys(mealsByType).length > 0 ? (
                    Object.entries(mealsByType).map(([mealType, meals]) => (
                      <View key={`${dayNumber}-${mealType}`} style={styles.mealTypeContainer}>
                        <Text style={styles.mealTypeTitle}>{mealType}</Text>
                        
                        {meals.map((meal, mealIndex) => (
                          <View key={`${dayNumber}-${mealType}-${mealIndex}`} style={styles.exerciseRow}>
                            <View style={styles.exerciseInfo}>
                              <Text style={styles.exerciseName}>{meal.name}</Text>
                              <Text style={styles.exerciseDetails}>
                                {meal.quantity} {meal.unit} • {meal.calories} calories
                              </Text>
                            </View>
                            <Pressable
                              style={styles.deleteButton}
                              onPress={() => {
                                Alert.alert(
                                  'Delete Meal',
                                  `Are you sure you want to delete ${meal.name} from ${mealType}?`,
                                  [
                                    {
                                      text: 'Cancel',
                                      style: 'cancel'
                                    },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: () => handleDeleteMeal(meal)
                                    }
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noExercisesText}>No meals added yet</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    // Refresh both plans and exercises
    Promise.all([
      fetchPlans(),
      selectedPlanId ? fetchMeals(selectedPlanId) : Promise.resolve()
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [selectedPlanId]);

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Nutrition Schedule</Text>
      </View>
      <ScrollView 
        style={styles.container}
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8000ff']}
            tintColor={'#8000ff'}
          />
        }
      >
        <View style={styles.scheduleContainer}>
          {renderPlanSelector()}
          {renderDaysList()}
          
          <Pressable 
            style={({pressed}) => [
              styles.doneButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => {
              // Use the correct path to the (tabscoach) folder structure
              router.replace('/(tabscoach)/plans');
            }}
          >
            <LinearGradient
              colors={['#B721FF', '#8A2BE2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneButtonGradient}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#8000ff',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: Platform.OS === 'ios' ? 120 : 100,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  scheduleContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  buttonPressed: {
    transform: [{scale: 0.98}],
    opacity: 0.95,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  daysListContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  dayItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  dayButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  smallButton: {
    minWidth: 100,
    height: 32,
    marginRight: 8,
  },
  viewButton: {
    minWidth: 80,
    height: 32,
  },
  smallGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  exercisesContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 15,
  },
  exercisesContent: {
    padding: 15,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
  },
  noExercisesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    padding: 5,
  },
  planSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  planSelectorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  createPlanButton: {
    backgroundColor: '#8000ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  createPlanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  plansList: {
    paddingVertical: 10,
    paddingRight: 10,
  },
  planCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  selectedPlanCard: {
    backgroundColor: '#8000ff',
    borderColor: '#8000ff',
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  planCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  selectedPlanText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  doneButton: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '80%',
  },
  doneButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
    paddingHorizontal: 5,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eaeaea',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8000ff',
    marginHorizontal: 4,
  },
  disabledButtonText: {
    color: '#aaa',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mealTypeContainer: {
    marginBottom: 15,
  },
  mealTypeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8000ff',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
});
