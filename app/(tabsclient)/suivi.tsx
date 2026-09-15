import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Platform, useWindowDimensions, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import supabase from '../lib/supabase';

// Type definitions
type CoachUser = {
  Full_name: string;
  profile_image: string | null;
};

type CoachData = {
  coach_id: string;
  user: CoachUser;
};

type Exercise = {
  id: number;
  exercise: string;
  number_of_sets: number;
  number_of_repetition: string;
  completed: boolean;
  Progress: boolean;
};

type DailyWorkout = {
  day: number;
  exercises: Exercise[];
};

type PlanData = {
  plan_id: string;
  coach: CoachData;
};

type ClientPlanResponse = {
  plan: PlanData;
};

type Coach = {
  name: string;
  image: string;
  lastMessage: string;
  lastMessageTime: string;
  coachId: string;
};

export default function Tab() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [dailyWorkouts, setDailyWorkouts] = useState<DailyWorkout[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

  const fetchData = async () => {
    try {
      await fetchCoachInfo();
      await fetchDailyWorkouts();
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load workout data');
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

  const fetchCoachInfo = async () => {
    try {
      // Get current user's client ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get client ID from client table
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.error('Client error:', clientError);
        setCoach(null);
        return;
      }

      // Get the client's plan with coach information in a single query
      const { data: planData, error: planError } = await supabase
        .from('client_plan')
        .select(`
          plan:plan_id (
            plan_id,
            coach:coach_id (
              coach_id,
              user:user_id (
                Full_name,
                profile_image
              )
            )
          )
        `)
        .eq('client_id', clientData.client_id)
        .order('purchase_date', { ascending: false })
        .limit(1)
        .single();

      if (planError || !planData) {
        console.error('Plan error:', planError);
        setCoach(null);
        return;
      }

      // Type assertion with unknown as intermediate step
      const response = planData as unknown as ClientPlanResponse;
      if (!response.plan?.coach?.user) {
        console.error('No coach data found');
        setCoach(null);
        return;
      }

      // Set the coach information
      setCoach({
        name: response.plan.coach.user.Full_name,
        image: response.plan.coach.user.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
        lastMessage: 'Welcome to your personalized training program!',
        lastMessageTime: 'Just now',
        coachId: response.plan.coach.coach_id
      });

    } catch (error) {
      console.error('Error fetching coach info:', error);
      setCoach(null);
    }
  };

  const fetchDailyWorkouts = async () => {
    try {
      // Get current user's client ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to view your workouts');
        return;
      }

      const { data: clientData } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) {
        Alert.alert('Error', 'Could not find client information');
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
        Alert.alert('Error', 'No plans found for your account');
        return;
      }

      // Filter for fitness plans only
      const fitnessPlan = clientPlans.find(cp => 
        cp.plan?.type === 'fitness' || cp.plan?.type === 'fitness & nutrition'
      );

      if (!fitnessPlan) {
        Alert.alert('Error', 'No fitness plan found');
        return;
      }

      // For now, let's just show day 1 workouts
      const dayToShow = 1;

      // Fetch workout schedule for day 1 only
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('client_fitness_schedule')
        .select('*')
        .eq('client_plan_id', fitnessPlan.client_plan_id)
        .eq('day', dayToShow);

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError);
        Alert.alert('Error', 'Failed to load workout schedule');
        return;
      }

      if (scheduleData && scheduleData.length > 0) {
        // Format the workouts for day 1
        const formattedWorkouts = [{
          day: dayToShow,
          exercises: scheduleData.map(workout => ({
            id: workout.id,
            exercise: workout.exercise,
            number_of_sets: workout.number_of_sets,
            number_of_repetition: workout.number_of_repetition,
            completed: workout.Progress,
            Progress: workout.Progress
          }))
        }];

        setDailyWorkouts(formattedWorkouts);
        setCurrentDay(dayToShow);
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
          const formattedWorkouts = [{
            day: dayToShow,
            exercises: fitnessWorkouts.map(workout => ({
              id: workout.id,
              exercise: workout.exercise,
              number_of_sets: workout.number_of_sets,
              number_of_repetition: workout.number_of_repetition,
              completed: false,
              Progress: false
            }))
          }];

          setDailyWorkouts(formattedWorkouts);
          setCurrentDay(dayToShow);
        } else {
          Alert.alert('Info', 'No workouts found for today');
          setDailyWorkouts([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchDailyWorkouts:', error);
      Alert.alert('Error', 'Failed to load workout data');
    }
  };

  const toggleExerciseCompletion = async (dayIndex: number, exerciseId: number) => {
    try {
      const exercise = dailyWorkouts[dayIndex].exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      // Show confirmation dialog
      Alert.alert(
        exercise.Progress ? 'Unmark Exercise' : 'Mark Exercise',
        exercise.Progress 
          ? 'Are you sure you want to unmark this exercise as completed?'
          : 'Are you sure you want to mark this exercise as completed?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Update the database first
                const { error } = await supabase
                  .from('client_fitness_schedule')
                  .update({ 
                    Progress: !exercise.Progress 
                  })
                  .eq('id', exerciseId);

                if (error) {
                  console.error('Database update error:', error);
                  Alert.alert('Error', 'Failed to update exercise status');
                  return;
                }

                // If database update successful, update the UI
                setDailyWorkouts(prevWorkouts => {
                  return prevWorkouts.map((workout, index) => {
                    if (index === dayIndex) {
                      return {
                        ...workout,
                        exercises: workout.exercises.map(ex => {
                          if (ex.id === exerciseId) {
                            return { 
                              ...ex, 
                              Progress: !exercise.Progress,
                              completed: !exercise.Progress
                            };
                          }
                          return ex;
                        })
                      };
                    }
                    return workout;
                  });
                });

                // Show success message
                Alert.alert(
                  'Success',
                  exercise.Progress 
                    ? 'Exercise unmarked successfully'
                    : 'Exercise marked as completed'
                );

              } catch (error) {
                console.error('Error updating exercise:', error);
                Alert.alert('Error', 'Failed to update exercise status');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in toggleExerciseCompletion:', error);
      Alert.alert('Error', 'Failed to process exercise status');
    }
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      // Get all completed exercises
      const completedExercises = dailyWorkouts.flatMap(workout => 
        workout.exercises.filter(ex => ex.completed)
      );

      // Update progress in database for each completed exercise
      for (const exercise of completedExercises) {
        const { error } = await supabase
          .from('client_fitness_schedule')
          .update({ Progress: true })
          .eq('id', exercise.id);

        if (error) {
          console.error('Error updating progress:', error);
          throw error;
        }
      }

      Alert.alert('Success', 'Progress saved successfully');
    } catch (error) {
      console.error('Error saving progress:', error);
      Alert.alert('Error', 'Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  };

  const renderWorkoutDay = (workout: DailyWorkout, index: number) => (
    <View key={workout.day} style={styles.workoutDayContainer}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, isSmallDevice && styles.smallText]}>
          Today's Workout
        </Text>
        <View style={styles.dayProgress}>
          <Text style={[styles.progressText, isSmallDevice && styles.smallSubtext]}>
            {workout.exercises.filter(ex => ex.Progress).length}/{workout.exercises.length} completed
          </Text>
        </View>
      </View>

      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseCard}>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, isSmallDevice && styles.smallText]}>
              {exercise.exercise}
            </Text>
            <View style={styles.exerciseDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="repeat" size={isSmallDevice ? 14 : 16} color="#666" />
                <Text style={[styles.detailText, isSmallDevice && styles.smallSubtext]}>
                  {exercise.number_of_sets} sets
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="fitness" size={isSmallDevice ? 14 : 16} color="#666" />
                <Text style={[styles.detailText, isSmallDevice && styles.smallSubtext]}>
                  {exercise.number_of_repetition} reps
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.doneButton,
              exercise.Progress && styles.doneButtonCompleted
            ]}
            onPress={() => toggleExerciseCompletion(index, exercise.id)}
          >
            <Text style={[
              styles.doneButtonText,
              exercise.Progress && styles.doneButtonTextCompleted
            ]}>
              {exercise.Progress ? 'Unmark' : 'Mark Done'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.chatSection}
            onPress={() => {
              if (coach?.coachId) {
                router.push({
                  pathname: '/plan/Chatcoach',
                  params: { coachId: coach.coachId }
                });
              } else {
                Alert.alert('Error', 'Coach information not available');
              }
            }}
          >
            <View style={styles.chatHeader}>
              <View style={styles.coachInfo}>
                <Image 
                  source={{ uri: coach?.image || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                  style={styles.coachImage} 
                />
                <View style={styles.coachText}>
                  <Text style={[styles.coachName, isSmallDevice && styles.smallText]}>
                    {coach?.name || 'No Coach Available'}
                  </Text>
                  <Text style={[styles.coachTitle, isSmallDevice && styles.smallSubtext]}>
                    Personal Coach
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={isSmallDevice ? 20 : 24} color="#666" />
            </View>
            <View style={styles.messagePreview}>
              <Text style={[styles.messageText, isSmallDevice && styles.smallText]}>
                {coach?.lastMessage || 'No coach is at your disposition for the moment. Purchase a plan to get access to a personal coach.'}
              </Text>
              <Text style={[styles.messageTime, isSmallDevice && styles.smallSubtext]}>
                {coach?.lastMessageTime || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.planButton}
            onPress={() => router.push('/plan/my-plan')}
          >
            <View style={styles.planButtonContent}>
              <Ionicons name="barbell" size={isSmallDevice ? 24 : 28} color="#8A2BE2" />
              <Text style={[styles.planButtonText, isSmallDevice && styles.smallText]}>
                My workout plan
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isSmallDevice ? 20 : 24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.planButton}
            onPress={() => router.push('/plan/my_nutrition_plan')}
          >
            <View style={styles.planButtonContent}>
              <Ionicons name="nutrition" size={isSmallDevice ? 24 : 28} color="#8A2BE2" />
              <Text style={[styles.planButtonText, isSmallDevice && styles.smallText]}>
                My nutrition plan
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isSmallDevice ? 20 : 24} color="#666" />
          </TouchableOpacity>

          <View style={styles.workoutsSection}>
            <Text style={[styles.sectionTitle, isSmallDevice && styles.smallText]}>
              Your Workout Program
            </Text>
            {dailyWorkouts.length > 0 ? (
              dailyWorkouts.map((workout, index) => renderWorkoutDay(workout, index))
            ) : (
              <View style={styles.noWorkoutsContainer}>
                <Text style={styles.noWorkoutsText}>
                  No workouts available. Please purchase a plan to start your fitness journey.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    ...Platform.select({
      android: {
        marginTop: 50,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  chatSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  coachText: {
    flex: 1,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  coachTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  messagePreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 70,
  },
  planButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 16,
  },
  workoutsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  workoutDayContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  dayProgress: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  doneButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  doneButtonCompleted: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
  },
  doneButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  doneButtonTextCompleted: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#8A2BE2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noWorkoutsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  noWorkoutsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Responsive styles for smaller devices
  smallText: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
  },
  smallSubtext: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
  },
});
