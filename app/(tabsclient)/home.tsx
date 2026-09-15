import { View, Text, StyleSheet, Platform, Pressable, ScrollView, Animated, Image, RefreshControl, Modal, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import supabase from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';

interface Plan {
  type: 'fitness' | 'nutrition' | 'fitness & nutrition';
}

interface FoodItem {
  name: string;
  calories_per_unit: number;
  unit: string;
}

interface ClientPlan {
  client_plan_id: string;
  plan_id: string;
  purchase_date: string;
  plan: Plan;
}

interface NutritionScheduleItem {
  id: string;
  day: number;
  meal_type: string;
  quantity: number;
  food_item_id: string;
  food_items: FoodItem;
}

interface ClientNutritionScheduleItem {
  id: string;
  day: number;
  meal_type: string;
  quantity: number;
  food_item_id: string;
  food_items: FoodItem;
}

interface RawClientPlan {
  client_plan_id: string;
  plan_id: string;
  purchase_date: string;
  plan: {
    type: 'fitness' | 'nutrition' | 'fitness & nutrition';
  };
}

const DAILY_TIPS = [
  {
    icon: "water-outline",
    title: "Hydration Reminder",
    description: "Remember to drink at least 8 glasses of water daily to stay properly hydrated.",
    bgColor: "#e8f5e9",
    iconColor: "#4caf50"
  },
  {
    icon: "bed-outline",
    title: "Sleep Schedule",
    description: "Aim for 7-9 hours of quality sleep each night for better recovery.",
    bgColor: "#e3f2fd",
    iconColor: "#2196f3"
  },
  {
    icon: "nutrition-outline",
    title: "Balanced Diet",
    description: "Include proteins, carbs, and healthy fats in every meal.",
    bgColor: "#fff3e0",
    iconColor: "#ff9800"
  },
  {
    icon: "walk-outline",
    title: "Daily Movement",
    description: "Take at least 10,000 steps daily for better health.",
    bgColor: "#fce4ec",
    iconColor: "#e91e63"
  },
  {
    icon: "fitness-outline",
    title: "Stretching",
    description: "Take 10 minutes to stretch in the morning for flexibility.",
    bgColor: "#f3e5f5",
    iconColor: "#9c27b0"
  },
  {
    icon: "medical-outline",
    title: "Recovery",
    description: "Take rest days between intense workouts for proper recovery.",
    bgColor: "#e8eaf6",
    iconColor: "#3f51b5"
  },
  {
    icon: "restaurant-outline",
    title: "Portion Control",
    description: "Use smaller plates to control portion sizes during meals.",
    bgColor: "#ffebee",
    iconColor: "#f44336"
  },
  {
    icon: "sunny-outline",
    title: "Vitamin D",
    description: "Get 10-30 minutes of sunlight daily for vitamin D.",
    bgColor: "#fff8e1",
    iconColor: "#ffc107"
  }
];

interface StatCardProps {
  title: string;
  current: number;
  goal: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function Tab() {
  const [fullName, setFullName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const [stats, setStats] = useState({
    streak: { current: 1, goal: 7 },
    workouts: { current: 1, goal: 3 },
    completedExercises: { current: 3, goal: 10 }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [hasActivePlan, setHasActivePlan] = useState<boolean>(false);
  const [hasActiveNutritionPlan, setHasActiveNutritionPlan] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch user's daily stats
        const { data: statsData } = await supabase
          .from('daily_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (statsData) {
          setStats({
            streak: { current: statsData.streak || 0, goal: 7 },
            workouts: { current: statsData.workouts || 0, goal: 3 },
            completedExercises: { current: statsData.completed_exercises || 0, goal: 10 }
          });
        } else {
          // Create new stats for today if none exist
          const { data: newStats, error } = await supabase
            .from('daily_stats')
            .insert([
              {
                user_id: user.id,
                date: today,
                streak: 0,
                workouts: 0,
                completed_exercises: 0
              }
            ])
            .select()
            .single();
          
          if (newStats) {
            setStats({
              streak: { current: 0, goal: 7 },
              workouts: { current: 0, goal: 3 },
              completedExercises: { current: 0, goal: 10 }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateProfileCompletion = (userData: any) => {
    if (!userData) return 0;
    
    const fields = [
      'Full_name',
      'birthdate',
      'gender',
      'phone_number',
      'profile_image',
      'address',
      'height',
      'weight'
    ];
    
    const filledFields = fields.filter(field => {
      const value = userData[field];
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const getUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Set email from auth user
        const email = user.email || '';
        
        // Get full name from user metadata
        const fullName = user.user_metadata?.full_name || '';
        
        // Get profile image from user table
        const { data: profileData, error } = await supabase
          .from('user')
          .select('profile_image, Full_name, birthdate, gender, phone_number, address, height, weight')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (profileData?.profile_image) {
          setProfileImage(profileData.profile_image);
        }
        if (profileData?.Full_name) {
          setFullName(profileData.Full_name);
        }
        
        // Calculate profile completion percentage
        setProfileCompletion(calculateProfileCompletion(profileData));

        // Subscribe to profile updates
        const profileUpdateSubscription = supabase
          .channel(`profile-update-${user.id}`)
          .on('broadcast', { event: 'profile-changed' }, (payload) => {
            console.log('Profile broadcast received in home:', payload);
            if (payload.payload) {
              setFullName(payload.payload.fullName || fullName);
              
              // Recalculate profile completion with updated data
              const updatedProfileData = { ...profileData, ...payload.payload };
              setProfileCompletion(calculateProfileCompletion(updatedProfileData));
            }
          })
          .on('broadcast', { event: 'profile-image-changed' }, (payload) => {
            console.log('Image broadcast received in home:', payload);
            if (payload.payload?.profile_image) {
              setProfileImage(payload.payload.profile_image);
              
              // Update profile data and recalculate completion
              if (profileData) {
                const updatedProfileData = { 
                  ...profileData, 
                  profile_image: payload.payload.profile_image 
                };
                setProfileCompletion(calculateProfileCompletion(updatedProfileData));
              }
            }
          })
          .subscribe();

        // Subscribe to database changes
        const dbSubscription = supabase
          .channel('db-changes')
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'user',
              filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
              console.log('DB change received in home:', payload);
              const newData = payload.new;
              if (newData.Full_name) {
                setFullName(newData.Full_name);
              }
              if (newData.profile_image) {
                setProfileImage(newData.profile_image);
              }
              
              // Recalculate profile completion with updated data
              setProfileCompletion(calculateProfileCompletion(newData));
            }
          )
          .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
          profileUpdateSubscription.unsubscribe();
          dbSubscription.unsubscribe();
        };
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchTodayWorkouts = async () => {
    try {
      console.log('Starting fetchTodayWorkouts...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // Get client ID from client table
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.log('Error or no client data found:', clientError);
        return;
      }

      // Get the client's active plan
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
        console.log('No plans found for client');
        setTodayWorkouts([]);
        setHasActivePlan(false);
        return;
      }

      // Filter for fitness plans only
      const fitnessPlan = clientPlans.find(cp => 
        cp.plan?.type === 'fitness' || cp.plan?.type === 'fitness & nutrition'
      );

      if (!fitnessPlan) {
        console.log('No fitness plan found');
        setTodayWorkouts([]);
        setHasActivePlan(false);
        return;
      }

      // For now, let's show day 1 workouts (same as suivi.tsx)
      const dayToShow = 1;

      // Fetch workout schedule for day 1
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('client_fitness_schedule')
        .select('*')
        .eq('client_plan_id', fitnessPlan.client_plan_id)
        .eq('day', dayToShow);

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError);
        return;
      }

      if (scheduleData && scheduleData.length > 0) {
        // Format the workouts
        const formattedWorkouts = scheduleData.map(workout => ({
          id: workout.id,
          exercise: workout.exercise,
          sets: workout.number_of_sets,
          reps: workout.number_of_repetition,
          Progress: workout.Progress
        }));

        console.log('Setting formatted workouts:', formattedWorkouts);
        setTodayWorkouts(formattedWorkouts);
        setCurrentDay(dayToShow);
        setHasActivePlan(true);
      } else {
        // If no workouts found in client_fitness_schedule, try to copy from fitness_schedule
        const { data: fitnessWorkouts, error: fitnessError } = await supabase
          .from('fitness_schedule')
          .select('*')
          .eq('plan_id', fitnessPlan.plan_id)
          .eq('day', dayToShow);

        if (fitnessError) {
          console.error('Error fetching fitness schedule:', fitnessError);
          return;
        }

        if (fitnessWorkouts && fitnessWorkouts.length > 0) {
          // Copy workouts to client_fitness_schedule
          const { error: insertError } = await supabase
            .from('client_fitness_schedule')
            .insert(
              fitnessWorkouts.map(workout => ({
                day: workout.day,
                exercise: workout.exercise,
                number_of_sets: workout.number_of_sets,
                number_of_repetition: workout.number_of_repetition,
                client_plan_id: fitnessPlan.client_plan_id,
                plan_id: fitnessPlan.plan_id,
                coach_id: workout.coach_id,
                Progress: false
              }))
            );

          if (insertError) {
            console.error('Error copying workouts:', insertError);
            return;
          }

          // Format the newly inserted workouts
          const formattedWorkouts = fitnessWorkouts.map(workout => ({
            id: workout.id,
            exercise: workout.exercise,
            sets: workout.number_of_sets,
            reps: workout.number_of_repetition,
            Progress: false
          }));

          console.log('Setting newly inserted workouts:', formattedWorkouts);
          setTodayWorkouts(formattedWorkouts);
          setCurrentDay(dayToShow);
          setHasActivePlan(true);
        } else {
          console.log('No workouts found for any day');
          setTodayWorkouts([]);
          setHasActivePlan(true);
        }
      }
    } catch (error) {
      console.error('Error in fetchTodayWorkouts:', error);
      setTodayWorkouts([]);
      setHasActivePlan(false);
    }
  };

  const fetchTodayNutrition = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // Get client ID from client table
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.log('Error or no client data found:', clientError);
        return;
      }

      // Get the client's active plan
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
        console.log('No plans found for client');
        setTodayMeals([]);
        setHasActiveNutritionPlan(false);
        return;
      }

      // Filter for nutrition plans only
      const nutritionPlan = clientPlans.find(cp => 
        cp.plan?.type === 'nutrition' || cp.plan?.type === 'fitness & nutrition'
      );

      if (!nutritionPlan) {
        console.log('No nutrition plan found');
        setTodayMeals([]);
        setHasActiveNutritionPlan(false);
        return;
      }

      // For now, let's show day 1 nutrition (same as workouts)
      const dayToShow = 1;

      // Fetch nutrition schedule for day 1
      const { data: nutritionData, error: nutritionError } = await supabase
        .from('client_nutrition_schedule')
        .select(`
          id,
          day,
          meal_type,
          quantity,
          food_item_id,
          food_items (
            name,
            calories_per_unit,
            unit
          )
        `)
        .eq('client_plan_id', nutritionPlan.client_plan_id)
        .eq('day', dayToShow)
        .order('meal_type', { ascending: true });

      if (nutritionError) {
        console.error('Error fetching nutrition:', nutritionError);
        return;
      }

      if (nutritionData && nutritionData.length > 0) {
        const formattedMeals = nutritionData.map(item => {
          const typedItem = item as unknown as ClientNutritionScheduleItem;
          const foodItem = typedItem.food_items;
          let formattedQuantity;
          
          if (foodItem?.unit) {
            if (foodItem.unit.startsWith('1') && foodItem.unit.length > 1) {
              formattedQuantity = `${typedItem.quantity}${foodItem.unit.substring(1)}`;
            } else if (isNaN(Number(foodItem.unit))) {
              formattedQuantity = `${typedItem.quantity}${foodItem.unit}`;
            } else {
              formattedQuantity = `${typedItem.quantity * Number(foodItem.unit)}`;
            }
          } else {
            formattedQuantity = `${typedItem.quantity} servings`;
          }
          
          return {
            id: typedItem.id,
            day: typedItem.day,
            meal_type: typedItem.meal_type,
            food_name: foodItem?.name || 'Unknown Food',
            quantity: formattedQuantity,
            calories: Math.round(typedItem.quantity * (foodItem?.calories_per_unit || 0)),
            food_item_id: typedItem.food_item_id
          };
        });
        
        console.log('Formatted meals:', formattedMeals);
        setTodayMeals(formattedMeals);
        setCurrentDay(dayToShow);
        setHasActiveNutritionPlan(true);
      } else {
        // If no meals found in client_nutrition_schedule, try to copy from nutrition_schedule
        const { data: nutritionMeals, error: nutritionError } = await supabase
          .from('nutrition_schedule')
          .select(`
            *,
            food_items (
              name,
              calories_per_unit,
              unit
            )
          `)
          .eq('plan_id', nutritionPlan.plan_id)
          .eq('day', dayToShow);

        if (nutritionError) {
          console.error('Error fetching nutrition schedule:', nutritionError);
          return;
        }

        if (nutritionMeals && nutritionMeals.length > 0) {
          // Copy meals to client_nutrition_schedule
          const { error: insertError } = await supabase
            .from('client_nutrition_schedule')
            .insert(
              nutritionMeals.map(meal => ({
                day: meal.day,
                meal_type: meal.meal_type,
                quantity: meal.quantity,
                food_item_id: meal.food_item_id,
                client_plan_id: nutritionPlan.client_plan_id,
                plan_id: nutritionPlan.plan_id,
                coach_id: meal.coach_id
              }))
            );

          if (insertError) {
            console.error('Error copying meals:', insertError);
            return;
          }

          // Format the newly inserted meals
          const formattedMeals = nutritionMeals.map(meal => {
            const foodItem = meal.food_items;
            let formattedQuantity;
            
            if (foodItem?.unit) {
              if (foodItem.unit.startsWith('1') && foodItem.unit.length > 1) {
                formattedQuantity = `${meal.quantity}${foodItem.unit.substring(1)}`;
              } else if (isNaN(Number(foodItem.unit))) {
                formattedQuantity = `${meal.quantity}${foodItem.unit}`;
              } else {
                formattedQuantity = `${meal.quantity * Number(foodItem.unit)}`;
              }
            } else {
              formattedQuantity = `${meal.quantity} servings`;
            }
            
            return {
              id: meal.id,
              day: meal.day,
              meal_type: meal.meal_type,
              food_name: foodItem?.name || 'Unknown Food',
              quantity: formattedQuantity,
              calories: Math.round(meal.quantity * (foodItem?.calories_per_unit || 0)),
              food_item_id: meal.food_item_id
            };
          });

          console.log('Setting newly inserted meals:', formattedMeals);
          setTodayMeals(formattedMeals);
          setCurrentDay(dayToShow);
          setHasActiveNutritionPlan(true);
        } else {
          console.log('No meals found for any day');
          setTodayMeals([]);
          setHasActiveNutritionPlan(true);
        }
      }
    } catch (error) {
      console.error('Error in fetchTodayNutrition:', error);
      setTodayMeals([]);
      setHasActiveNutritionPlan(false);
    }
  };

  const resetStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Check if stats exist for today
      const { data: existingStats } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingStats) {
        // Reset all stats to zero
        await supabase
          .from('daily_stats')
          .update({
            streak: 0,
            workouts: 0,
            completed_exercises: 0
          })
          .eq('user_id', user.id)
          .eq('date', today);
      } else {
        // Create new stats with all values at zero
        await supabase
          .from('daily_stats')
          .insert([
            {
              user_id: user.id,
              date: today,
              streak: 0,
              workouts: 0,
              completed_exercises: 0
            }
          ]);
      }

      // Update the UI
      setStats({
        streak: { current: 0, goal: 7 },
        workouts: { current: 0, goal: 3 },
        completedExercises: { current: 0, goal: 10 }
      });
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  };

  const updateStats = async (completedExercises: number, isWorkoutCompleted: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // First check if stats exist for today
      const { data: existingStats } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      let newStats;
      if (existingStats) {
        // Update only the specific stat that changed, not all of them
        const updates: any = {};
        
        // Only update completed_exercises if that's what changed
        if (completedExercises !== 0) {
          updates.completed_exercises = (existingStats.completed_exercises || 0) + completedExercises;
        }
        
        // Only update workouts if that's what changed
        if (isWorkoutCompleted) {
          updates.workouts = (existingStats.workouts || 0) + 1;
        }

        const { data: updatedStats, error } = await supabase
          .from('daily_stats')
          .update(updates)
          .eq('user_id', user.id)
          .eq('date', today)
          .select()
          .single();

        if (updatedStats) {
          newStats = {
            streak: { current: updatedStats.streak || 0, goal: 7 },
            workouts: { current: updatedStats.workouts || 0, goal: 3 },
            completedExercises: { current: updatedStats.completed_exercises || 0, goal: 10 }
          };
        }
      } else {
        // Create new stats for today with only the changed values
        const newStatsData: any = {
          user_id: user.id,
          date: today,
          streak: 0,
          workouts: 0,
          completed_exercises: 0
        };
        
        // Only set the values that changed
        if (completedExercises !== 0) {
          newStatsData.completed_exercises = completedExercises;
        }
        
        if (isWorkoutCompleted) {
          newStatsData.workouts = 1;
        }
        
        const { data: insertedStats, error } = await supabase
          .from('daily_stats')
          .insert([newStatsData])
          .select()
          .single();
        
        if (insertedStats) {
          newStats = {
            streak: { current: insertedStats.streak || 0, goal: 7 },
            workouts: { current: insertedStats.workouts || 0, goal: 3 },
            completedExercises: { current: insertedStats.completed_exercises || 0, goal: 10 }
          };
        }
      }

      // Update the UI immediately with new stats
      if (newStats) {
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const handleWorkoutCompletion = async () => {
    // Simply redirect to the suivi page without updating stats
    router.push('/suivi');
  };

  // Add this useEffect to refresh stats periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Update the onRefresh function to ensure stats are refreshed
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getUserProfile(),
        fetchStats(),
        fetchTodayWorkouts(),
        fetchTodayNutrition()
      ]);
      
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % DAILY_TIPS.length);
      console.log('Page refreshed successfully');
    } catch (error) {
      console.error('Error refreshing home page:', error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Initial data loading
    getUserProfile();
    fetchStats();
    fetchTodayWorkouts();
    fetchTodayNutrition();
    
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change tip
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % DAILY_TIPS.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Add this useEffect at the top of the component to log state changes
  useEffect(() => {
    console.log('State updated:', {
      hasActivePlan,
      hasActiveNutritionPlan,
      todayWorkouts,
      todayMeals,
      currentDay
    });
  }, [hasActivePlan, hasActiveNutritionPlan, todayWorkouts, todayMeals, currentDay]);

  // Add useEffect to log state changes
  useEffect(() => {
    console.log('State updated - todayWorkouts:', todayWorkouts);
    console.log('State updated - hasActivePlan:', hasActivePlan);
    console.log('State updated - currentDay:', currentDay);
  }, [todayWorkouts, hasActivePlan, currentDay]);

  const StatCard = ({ title, current, goal, icon, color }: StatCardProps) => {
    const progress = (current / goal) * 100;
    const progressColor = progress >= 100 ? '#4CAF50' : color;

    return (
      <View style={styles.statCard}>
        <LinearGradient
          colors={[`${color}20`, `${color}10`]}
          style={styles.statGradient}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <Text style={styles.statValue}>{current}</Text>
          <Text style={styles.statLabel}>{title}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: progressColor
                }
              ]} 
            />
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#b300ff', '#8000ff']}
          tintColor="#b300ff"
          progressBackgroundColor="#ffffff"
          progressViewOffset={Platform.OS === 'ios' ? 20 : 0}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#8000ff', '#8000ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => setShowImageModal(true)}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <Ionicons name="person-outline" size={24} color="#fff" />
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </TouchableOpacity>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userName}>{fullName || 'User'}</Text>
              <View style={styles.statsPreview}>
                <View style={styles.statItem}>
                  <Ionicons name="flame" size={14} color="#fff" />
                  <Text style={styles.statText}>2,450</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="fitness" size={14} color="#fff" />
                  <Text style={styles.statText}>3/5</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/suivi')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/more')}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={styles.subText}>Track your fitness journey today</Text>
        </View>
      </LinearGradient>

      <View style={styles.workoutsSection}>

        <Animated.View 
          style={[
            styles.tipCard, 
            { 
              backgroundColor: DAILY_TIPS[currentTipIndex].bgColor,
              opacity: fadeAnim 
            }
          ]}
        >
          <View style={styles.tipContent}>
            <View style={[styles.tipIconContainer, { backgroundColor: DAILY_TIPS[currentTipIndex].iconColor + '20' }]}>
              <Ionicons 
                name={DAILY_TIPS[currentTipIndex].icon as keyof typeof Ionicons.glyphMap}
                size={24} 
                color={DAILY_TIPS[currentTipIndex].iconColor} 
              />
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>{DAILY_TIPS[currentTipIndex].title}</Text>
              <Text style={styles.tipDescription}>{DAILY_TIPS[currentTipIndex].description}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <Pressable onPress={() => router.push('/stats')}>
            <Text style={styles.viewAll}>View Details</Text>
          </Pressable>
        </View>
        <View style={styles.statsContainer}>
          <StatCard
            title="Streak"
            current={stats.streak.current}
            goal={stats.streak.goal}
            icon="flame"
            color="#FF5252"
          />
          <StatCard
            title="Workouts"
            current={stats.workouts.current}
            goal={stats.workouts.goal}
            icon="barbell"
            color="#3F51B5"
          />
          <StatCard
            title="Completed Exercises"
            current={stats.completedExercises.current}
            goal={stats.completedExercises.goal}
            icon="checkmark-circle"
            color="#009688"
          />
        </View>
      </View>


      <View style={styles.workoutsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Workouts</Text>
          <Pressable onPress={() => router.push('/plan/my-plan')}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>
        
        <View style={styles.workoutCard}>
          {!hasActivePlan ? (
            <View style={styles.workoutContent}>
              <Ionicons name="barbell-outline" size={24} color="#8000ff" />
              <Text style={styles.noWorkoutsText}>No active workout plan</Text>
            </View>
          ) : todayWorkouts && todayWorkouts.length > 0 ? (
            <>
              <View style={styles.workoutCardHeader}>
                <View style={styles.workoutHeaderLeft}>
                  <Ionicons name="barbell" size={20} color="#8000ff" />
                  <Text style={styles.workoutDayText}>Today's Workout</Text>
                </View>
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {todayWorkouts.filter(w => w.Progress).length}/{todayWorkouts.length}
                  </Text>
                  <Text style={styles.progressLabel}>completed</Text>
                </View>
              </View>
              <View style={styles.workoutsList}>
                {todayWorkouts.map((workout, index) => (
                  <View key={workout.id || index} style={styles.workoutItem}>
                    <View style={styles.workoutItemLeft}>
                      <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.workoutItemText} numberOfLines={1}>
                        {workout.exercise}
                      </Text>
                    </View>
                    <View style={styles.workoutItemRight}>
                      <View style={styles.workoutDetails}>
                        <View style={styles.detailBadge}>
                          <Ionicons name="repeat" size={14} color="#8000ff" />
                          <Text style={styles.detailText}>{workout.sets}</Text>
                        </View>
                        <View style={styles.detailBadge}>
                          <Ionicons name="fitness" size={14} color="#8000ff" />
                          <Text style={styles.detailText}>{workout.reps}</Text>
                        </View>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        workout.Progress && styles.statusBadgeCompleted
                      ]}>
                        <Text style={[
                          styles.statusText,
                          workout.Progress && styles.statusTextCompleted
                        ]}>
                          {workout.Progress ? 'Done' : 'To Do'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.workoutContent}>
              <Ionicons name="barbell-outline" size={24} color="#8000ff" />
              <Text style={styles.noWorkoutsText}>No workouts scheduled for today</Text>
            </View>
          )}
          <Pressable 
            style={styles.completeWorkoutButton} 
            onPress={() => router.push('/plan/my-plan')}
          >
            <Text style={styles.completeWorkoutButtonText}>View Complete Workout Plan</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.workoutsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nutrition Plan</Text>
          <Pressable onPress={() => router.push('/plan/my_nutrition_plan')}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>
        
        <View style={styles.workoutCard}>
          {!hasActiveNutritionPlan ? (
            <View style={styles.workoutContent}>
              <Ionicons name="nutrition-outline" size={24} color="#8000ff" />
              <Text style={styles.noWorkoutsText}>No active nutrition plan</Text>
            </View>
          ) : todayMeals && todayMeals.length > 0 ? (
            <>
              <View style={styles.workoutCardHeader}>
                <View style={styles.workoutHeaderLeft}>
                  <Ionicons name="nutrition" size={20} color="#8000ff" />
                  <Text style={styles.workoutDayText}>Day {currentDay} Nutrition</Text>
                </View>
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>{todayMeals.length}</Text>
                  <Text style={styles.progressLabel}>meals</Text>
                </View>
              </View>
              {todayMeals.slice(0, 3).map((meal, index) => (
                <View key={meal.id || index} style={styles.workoutItem}>
                  <View style={styles.workoutItemLeft}>
                    <View style={styles.nutritionIconContainer}>
                      <Ionicons 
                        name={
                          meal.meal_type.toLowerCase().includes('breakfast') ? "sunny-outline" :
                          meal.meal_type.toLowerCase().includes('lunch') ? "restaurant-outline" :
                          meal.meal_type.toLowerCase().includes('dinner') ? "moon-outline" : 
                          "nutrition-outline"
                        } 
                        size={18} 
                        color="#8000ff" 
                      />
                    </View>
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealTypeText}>{meal.meal_type}</Text>
                      <Text style={styles.workoutItemText} numberOfLines={1}>
                        {meal.food_name}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.workoutItemRight}>
                    <View style={styles.workoutDetails}>
                      <View style={styles.detailBadge}>
                        <Text style={styles.detailText} numberOfLines={1}>{meal.quantity}</Text>
                      </View>
                      <View style={styles.detailBadge}>
                        <Text style={styles.detailText}>{meal.calories} cal</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              {todayMeals.length > 3 && (
                <Text style={styles.moreWorkoutsText}>+{todayMeals.length - 3} more meals</Text>
              )}
            </>
          ) : (
            <View style={styles.workoutContent}>
              <Ionicons name="nutrition-outline" size={24} color="#8000ff" />
              <Text style={styles.noWorkoutsText}>No meals scheduled for today</Text>
            </View>
          )}
          <Pressable 
            style={styles.nutritionPlanButton} 
            onPress={() => router.push('/plan/my_nutrition_plan')}
          >
            <Text style={styles.completeWorkoutButtonText}>View Complete Nutrition Plan</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.modalContent}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }}
                style={styles.enlargedImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.enlargedImage, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Ionicons name="person-outline" size={100} color="#fff" />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#8000ff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  welcomeSection: {
    flexDirection: 'column',
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  dateSection: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
  },
  progressSection: {
    padding: 20,
    marginTop: -10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAll: {
    color: '#8000ff',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 15,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  workoutsSection: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  workoutContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noWorkoutsText: {
    color: '#666',
    fontSize: 16,
    marginVertical: 10,
  },
  planButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 10,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tipCard: {
    borderRadius: 15,
    padding: 15,
    marginTop: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeIcon: {
    color: '#fff',
    fontSize: 24,
  },
  profileCompletionContainer: {
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  profileCompletionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileCompletionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  profileCompletionPercentage: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  profileProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  workoutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8000ff20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8000ff',
  },
  workoutItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  workoutItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutDetails: {
    flexDirection: 'row',
    gap: 6,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8000ff20',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#8000ff',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusBadgeCompleted: {
    backgroundColor: '#8000ff20',
    borderColor: '#8000ff',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusTextCompleted: {
    color: '#8000ff',
  },
  completeWorkoutButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeWorkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  nutritionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8000ff20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8000ff',
    marginBottom: 3,
    textTransform: 'capitalize',
  },
  nutritionPlanButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreWorkoutsText: {
    fontSize: 14,
    color: '#8000ff',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8000ff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  workoutsList: {
    gap: 8,
  },
});
