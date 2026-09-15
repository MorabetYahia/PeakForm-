import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, Platform, Modal, StatusBar, Dimensions } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import supabase from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';

interface WorkoutExercise {
  name: string;
  sets: Set[];
  day: number;
  isExpanded?: boolean;
}

interface Set {
  reps: string;
}

interface FitnessSchedule {
  id: number;
  day: number;
  exercise: string;
  number_of_sets: number;
  number_of_repetition: string;
  created_at: string;
}

export default function PlanForm() {
  const [formData, setFormData] = useState({
    title: '',
    objectives: [] as string[],
    type: '',
    price: '',
    description: '',
    workoutPlan: Array(7).fill(''),
    workoutProgram: [] as WorkoutExercise[],
    level: '',
    plan_duration: ''
  });

  const [showObjectiveDropdown, setShowObjectiveDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showDayDropdowns, setShowDayDropdowns] = useState({
    workoutPlan: Array(7).fill(false),
    workoutProgram: Array(7).fill(false)
  });

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise>({
    name: '',
    sets: [],
    day: 0
  });
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  const [savedExercises, setSavedExercises] = useState<string[]>([]);

  const [workoutProgram, setWorkoutProgram] = useState<WorkoutExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const objectives = [
    'Weight Loss',
    'Muscle Gain',
    'Strength Training',
    'Cardio',
    'Flexibility',
    'Sports Specific',
    'Rehabilitation',
    'General Fitness',
    'Endurance Building',
    'Body Toning',
    'Posture Improvement',
    'Core Strength',
    'High Intensity Training',
    'Low Impact Exercise',
    'Balance Training',
    'Mobility Enhancement',
    'Power Training',
    'Speed Training',
    'Agility Training',
    'Recovery & Relaxation'
  ];

  const planTypes = [
    'fitness',
    'nutrition',
    'fitness & nutrition'
  ];

  const workoutOptions = [
    'Rest Day',
    'Upper Body Strength',
    'Lower Body Strength',
    'Full Body Workout',
    'HIIT Cardio',
    'Steady State Cardio',
    'Core & Abs',
    'Flexibility & Stretching',
    'Circuit Training',
    'Bodyweight Exercises',
    'Power Training',
    'Endurance Training',
    'Sports Specific Training'
  ];

  const nutritionOptions = [
    'Regular Balanced Diet',
    'High Protein Day',
    'Low Carb Day',
    'High Carb Day',
    'Calorie Deficit Day',
    'Calorie Surplus Day',
    'Intermittent Fasting',
    'Pre-Workout Nutrition Focus',
    'Post-Workout Nutrition Focus',
    'Detox Day',
    'Maintenance Day',
    'Refeed Day'
  ];

  const exercises = [
    'Push-ups',
    'Pull-ups',
    'Squats',
    'Deadlifts',
    'Bench Press',
    'Shoulder Press',
    'Bicep Curls',
    'Tricep Dips',
    'Lunges',
    'Plank',
    'Mountain Climbers',
    'Burpees',
    'Russian Twists',
    'Leg Press',
    'Lat Pulldown',
    'Chest Fly',
    'Leg Curls',
    'Calf Raises',
    'Box Jumps',
    'Kettlebell Swings'
  ];

  const sampleExercises: WorkoutExercise[] = [
    {
      name: "Push-ups",
      sets: [
        { reps: "12" },
        { reps: "15" },
        { reps: "10" }
      ],
      day: 1
    },
    {
      name: "Pull-ups",
      sets: [
        { reps: "8" },
        { reps: "10" },
        { reps: "6" }
      ],
      day: 1
    },
    {
      name: "Squats",
      sets: [
        { reps: "15" },
        { reps: "20" },
        { reps: "15" }
      ],
      day: 1
    },
    {
      name: "Plank",
      sets: [
        { reps: "30" },
        { reps: "45" },
        { reps: "60" }
      ],
      day: 1
    }
  ];

  const levels = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert'
  ];

  const durations = [
    '7 days',
    '14 days',
    '28 days'
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddExercise = () => {
    setShowExerciseModal(true);
    setSelectedExercise({
      name: '',
      sets: [],
      day: 0
    });
  };

  const handleSaveExercise = () => {
    if (selectedExercise.name && selectedExercise.sets.length > 0) {
      setFormData(prev => ({
        ...prev,
        workoutProgram: [...prev.workoutProgram, selectedExercise]
      }));
      setShowExerciseModal(false);
    }
  };

  const handleObjectiveChange = (objective: string) => {
    setFormData(prev => {
      const newObjectives = prev.objectives.includes(objective)
        ? prev.objectives.filter(obj => obj !== objective)
        : [...prev.objectives, objective];
      
      return {
        ...prev,
        objectives: newObjectives
      };
    });
  };

  const renderSelectedObjectives = () => {
    if (formData.objectives.length === 0) {
      return <Text style={styles.placeholderText}>Select objectives</Text>;
    }

    return (
      <View style={styles.selectedObjectivesContainer}>
        {formData.objectives.map((objective, index) => (
          <View key={index} style={styles.selectedObjectiveItem}>
            <Text style={styles.selectedObjectiveText}>{objective}</Text>
            <Pressable
              onPress={() => handleObjectiveChange(objective)}
              style={styles.removeObjectiveButton}
            >
              <Ionicons name="close-circle" size={20} color="#8000ff" />
            </Pressable>
          </View>
        ))}
      </View>
    );
  };

  const renderWorkoutProgram = () => {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Workout Program</Text>
        
        <View style={styles.dayContent}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>Day 1</Text>
            <Pressable
              style={styles.addExerciseButton}
              onPress={handleAddExercise}
            >
              <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
            </Pressable>
          </View>

          {renderProgramView()}
        </View>

        {renderExerciseModal()}
      </View>
    );
  };

  const renderExerciseModal = () => {
    if (!showExerciseModal) return null;

    return (
      <Modal
        visible={showExerciseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            
            <View style={styles.exerciseDropdownContainer}>
              <Pressable 
                style={[
                  styles.exerciseInput,
                  showExerciseDropdown && styles.exerciseInputActive
                ]}
                onPress={() => setShowExerciseDropdown(!showExerciseDropdown)}
              >
                <Text style={[
                  styles.exerciseInputText,
                  !selectedExercise.name && styles.exerciseInputPlaceholder
                ]}>
                  {selectedExercise.name || 'Select Exercise'}
                </Text>
                <Ionicons 
                  name={showExerciseDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
              
              {showExerciseDropdown && (
                <View style={styles.exerciseDropdownList}>
                  <ScrollView style={styles.exerciseDropdownScroll}>
                    {exercises.map((exercise, index) => (
                <Pressable
                  key={index}
                  style={[
                          styles.exerciseDropdownItem,
                          selectedExercise.name === exercise && styles.exerciseDropdownItemSelected
                  ]}
                        onPress={() => {
                          setSelectedExercise(prev => ({ ...prev, name: exercise }));
                          setShowExerciseDropdown(false);
                        }}
                >
                        <Text style={styles.exerciseDropdownItemText}>{exercise}</Text>
                  {selectedExercise.name === exercise && (
                    <Ionicons name="checkmark" size={20} color="#8000ff" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.setsRepsContainer}>
              <View style={styles.numberInputContainer}>
                <Text style={styles.numberInputLabel}>Sets</Text>
                <TextInput
                  style={styles.numberInput}
                  keyboardType="numeric"
                  value={selectedExercise.sets.map(set => set.reps).join(', ')}
                  onChangeText={(text) => setSelectedExercise(prev => ({
                    ...prev,
                    sets: text.split(', ').map(reps => ({ reps }))
                  }))}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExerciseModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveExercise}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      if (!formData.title || formData.objectives.length === 0 || !formData.type || !formData.price || !formData.description || !formData.level || !formData.plan_duration) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to create a plan');
        return;
      }

      // Check if user exists in coach table
      const { data: coachData, error: coachError } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        Alert.alert('Error', 'You must be a registered coach to create a plan');
        return;
      }

      // Save the plan with level and plan_duration
      const { data: planData, error: planError } = await supabase
        .from('plan')
        .insert([{
          plan_id: Crypto.randomUUID(),
          title: formData.title,
          objective: formData.objectives.join(', '),
          type: formData.type.toLowerCase(),
          price: parseFloat(formData.price),
          description: formData.description,
          coach_id: coachData.coach_id,
          created_at: new Date().toISOString(),
          level: formData.level,
          plan_duration: formData.plan_duration
        }])
        .select();

      if (planError) {
        console.error('Error creating plan:', planError);
        Alert.alert('Error', 'Failed to create plan. Please try again.');
        return;
      }

      // Determine the navigation path based on the selected plan type
      const navigateToPage = getNavigationPathByType(formData.type);

      Alert.alert('Success', 'Plan created successfully', [
        {
          text: 'OK',
          onPress: () => router.push(navigateToPage)
        }
      ]);
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    }
  };

  // Function to determine the navigation path based on plan type
  const getNavigationPathByType = (type: string): string => {
    type = type.toLowerCase();
    
    if (type === 'nutrition') {
      return '/plan/nutrition_schedule';
    } else if (type === 'fitness & nutrition') {
      // For combined plans, you could decide which page to show first
      // or create a new page that has tabs for both
      return '/plan/schedule';
    } else {
      // Default to fitness schedule
      return '/plan/schedule';
    }
  };

  const renderPlanTable = (planType: 'workoutPlan' | 'workoutProgram') => {
    const options = planType === 'workoutPlan' ? workoutOptions : nutritionOptions;
    
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{planType === 'workoutPlan' ? 'Workout Plan' : 'Workout Program'}</Text>
        {Array(7).fill(0).map((_, index) => (
          <View key={index} style={[styles.dayContainer, { zIndex: 7 - index }]}>
            <Text style={styles.dayLabel}>Day {index + 1}</Text>
            <View style={styles.dropdownContainer}>
              <Pressable 
                style={[
                  styles.typeInput,
                  showDayDropdowns[planType][index] && styles.dayInputActive
                ]}
                onPress={() => {
                  setShowDayDropdowns(prev => ({
                    ...prev,
                    [planType]: prev[planType].map((value, i) => i === index ? !value : false)
                  }));
                }}
              >
                <Text style={[
                  styles.typeInputText,
                  !formData[planType][index] && styles.dayInputPlaceholder
                ]}>
                  {formData[planType][index] || `Select ${planType === 'workoutPlan' ? 'workout' : 'workout program'} plan`}
                </Text>
                <Ionicons 
                  name={showDayDropdowns[planType][index] ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
              
              {showDayDropdowns[planType][index] && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.typeList} nestedScrollEnabled={true}>
                    {options.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.typeListItem,
                          formData[planType][index] === option && styles.optionItemSelected
                        ]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            [planType]: prev[planType].map((item, i) => i === index ? option : item)
                          }));
                          setShowDayDropdowns(prev => ({
                            ...prev,
                            [planType]: prev[planType].map((_, i) => i === index ? false : false)
                          }));
                        }}
                      >
                        <Text style={[
                          styles.typeListItemText,
                          formData[planType][index] === option && styles.optionTextSelected
                        ]}>{option}</Text>
                        {formData[planType][index] === option && (
                          <Ionicons name="checkmark" size={20} color="#8000ff" />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.savedExercise) {
      try {
        // First decode the URL component
        const decodedData = decodeURIComponent(String(params.savedExercise));
        // Then parse the JSON
        const exerciseData = JSON.parse(decodedData);
        
        // Add the exercise to the workout program without replacing existing ones
        setFormData(prev => {
          const newWorkoutProgram = [...prev.workoutProgram];
          newWorkoutProgram.push({
            name: exerciseData.name,
            sets: exerciseData.sets.map((set: string) => ({ reps: set })),
            day: exerciseData.day
          });
          
          return {
            ...prev,
            workoutProgram: newWorkoutProgram
          };
        });
      } catch (error: any) {
        console.error('Error parsing exercise data:', error);
        Alert.alert('Error', 'Failed to add exercise. Please try again.');
      }
    }
  }, [params.savedExercise]);

  useFocusEffect(
    React.useCallback(() => {
      fetchExercises();
    }, [])
  );

  const handleDeleteExercise = async (exercise: WorkoutExercise) => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to delete exercises');
        return;
      }

      // Check if user exists in coach table
      const { data: coachData, error: coachError } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        Alert.alert('Error', 'You must be a registered coach to delete exercises');
        return;
      }

      console.log('Starting delete process for exercise:', {
        day: exercise.day,
        exercise: exercise.name,
        sets: exercise.sets,
        coach_id: coachData.coach_id
      });

      // First, let's check what's in the database
      const { data: existingData, error: checkError } = await supabase
        .from('fitness_schedule')
        .select('*')
        .eq('day', exercise.day)
        .eq('exercise', exercise.name)
        .eq('coach_id', coachData.coach_id);

      if (checkError) {
        console.error('Error checking database:', checkError);
        Alert.alert('Error', 'Failed to check database');
        return;
      }

      console.log('Found in database:', existingData);

      if (!existingData || existingData.length === 0) {
        console.log('No matching exercise found in database');
        Alert.alert('Error', 'Exercise not found in database');
        return;
      }

      // Now try to delete
      const { data: deleteData, error: deleteError } = await supabase
        .from('fitness_schedule')
        .delete()
        .eq('day', exercise.day)
        .eq('exercise', exercise.name)
        .eq('coach_id', coachData.coach_id)
        .select();

      if (deleteError) {
        console.error('Delete error:', deleteError);
        Alert.alert('Error', `Failed to delete: ${deleteError.message}`);
        return;
      }

      console.log('Delete result:', deleteData);

      // Update local state
      setWorkoutProgram(prev => prev.filter(e => 
        !(e.day === exercise.day && e.name === exercise.name)
      ));

      Alert.alert('Success', 'Exercise deleted successfully');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Authentication error:', authError);
        Alert.alert('Error', 'Please sign in to view exercises');
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        Alert.alert('Error', 'Please sign in to view exercises');
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
        Alert.alert('Error', 'You must be a registered coach to view exercises');
        return;
      }

      console.log('Fetching exercises for coach_id:', coachData.coach_id);

      const { data, error } = await supabase
        .from('fitness_schedule')
        .select('*')
        .eq('coach_id', coachData.coach_id)
        .order('day', { ascending: true });

      if (error) {
        console.error('Error fetching exercises:', error);
        Alert.alert('Error', 'Failed to fetch exercises: ' + error.message);
        return;
      }

      console.log('Fetched exercises:', data);

      // Group exercises by day
      const exercisesByDay = (data as FitnessSchedule[]).reduce((acc: Record<number, FitnessSchedule[]>, exercise) => {
        if (!acc[exercise.day]) {
          acc[exercise.day] = [];
        }
        acc[exercise.day].push(exercise);
        return acc;
      }, {});

      // Convert to WorkoutExercise format
      const formattedExercises = Object.entries(exercisesByDay).map(([day, exercises]) => {
        // Group exercises by name
        const exercisesByName = exercises.reduce((acc: Record<string, WorkoutExercise>, exercise) => {
          if (!acc[exercise.exercise]) {
            acc[exercise.exercise] = {
              name: exercise.exercise,
              sets: [],
              day: exercise.day
            };
          }
          // Split the repetitions string and create set objects
          const reps = exercise.number_of_repetition.split(',').map((rep: string) => ({ reps: rep.trim() }));
          acc[exercise.exercise].sets = reps;
          return acc;
        }, {});

        return Object.values(exercisesByName);
      }).flat();

      setWorkoutProgram(formattedExercises);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchExercises:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching exercises');
      setIsLoading(false);
    }
  };

  const renderProgramView = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading exercises...</Text>
        </View>
      );
    }

    if (workoutProgram.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No exercises added yet</Text>
          <Text style={styles.emptyStateSubtext}>Click "Add Exercise" to start</Text>
        </View>
      );
    }

    // Get the current day from params or default to 1
    const currentDay = params.day ? parseInt(params.day as string) : 1;
    
    // Filter exercises for the current day
    const dayExercises = workoutProgram.filter(exercise => exercise.day === currentDay);

    return (
      <View style={styles.exercisesContainer}>
        {dayExercises.map((exercise, index) => (
          <View key={`${exercise.name}-${index}-${Date.now()}`} style={styles.exerciseSection}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Exercise',
                    `Are you sure you want to delete ${exercise.name}?`,
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel'
                      },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDeleteExercise(exercise)
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              </Pressable>
            </View>
            <View style={styles.setsContainer}>
              <Text style={styles.setsTitle}>Sets:</Text>
              {exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setItem}>
                  <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                  <Text style={styles.setReps}>{set.reps} reps</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable 
          style={({pressed}) => [
            styles.backButton,
            pressed && styles.buttonPressed
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Create New Plan</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          <View style={[styles.inputGroup, { zIndex: 50 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan title"
                value={formData.title}
                onChangeText={(text) => handleChange('title', text)}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 45 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Objectives (Select up to 2)</Text>
              <View style={styles.dropdownContainer}>
                <Pressable 
                  style={[
                    styles.typeInput,
                    showObjectiveDropdown && styles.inputActive
                  ]}
                  onPress={() => {
                    setShowObjectiveDropdown(!showObjectiveDropdown);
                    setShowTypeDropdown(false);
                    setShowLevelDropdown(false);
                    setShowDurationDropdown(false);
                  }}
                >
                  {renderSelectedObjectives()}
                  <Ionicons 
                    name={showObjectiveDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </Pressable>
                
                {showObjectiveDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.typeList} nestedScrollEnabled={true}>
                      {objectives.map((objective) => (
                        <Pressable
                          key={objective}
                          style={[
                            styles.typeListItem,
                            formData.objectives.includes(objective) && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            if (formData.objectives.includes(objective) || formData.objectives.length < 2) {
                              handleObjectiveChange(objective);
                            }
                          }}
                        >
                          <Text style={[
                            styles.typeListItemText,
                            formData.objectives.includes(objective) && styles.optionTextSelected
                          ]}>{objective}</Text>
                          {formData.objectives.includes(objective) && (
                            <Ionicons name="checkmark" size={20} color="#8000ff" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 40 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.dropdownContainer}>
                <Pressable 
                  style={[
                    styles.typeInput,
                    showTypeDropdown && styles.inputActive
                  ]}
                  onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                >
                  <Text style={styles.typeInputText}>
                    {formData.type || 'Select type'}
                  </Text>
                  <Ionicons 
                    name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </Pressable>
                
                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.typeList}>
                      {planTypes.map((type) => (
                        <Pressable
                          key={type}
                          style={styles.typeListItem}
                          onPress={() => {
                            handleChange('type', type);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={styles.typeListItemText}>{type}</Text>
                          {formData.type === type && (
                            <Ionicons name="checkmark" size={20} color="#8000ff" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 35 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Level</Text>
              <View style={styles.dropdownContainer}>
                <Pressable 
                  style={[
                    styles.typeInput,
                    showLevelDropdown && styles.inputActive
                  ]}
                  onPress={() => setShowLevelDropdown(!showLevelDropdown)}
                >
                  <Text style={styles.typeInputText}>
                    {formData.level || 'Select level'}
                  </Text>
                  <Ionicons 
                    name={showLevelDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </Pressable>
                
                {showLevelDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.typeList}>
                      {levels.map((level) => (
                        <Pressable
                          key={level}
                          style={styles.typeListItem}
                          onPress={() => {
                            handleChange('level', level);
                            setShowLevelDropdown(false);
                          }}
                        >
                          <Text style={styles.typeListItemText}>{level}</Text>
                          {formData.level === level && (
                            <Ionicons name="checkmark" size={20} color="#8000ff" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 30 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Plan Duration</Text>
              <View style={styles.dropdownContainer}>
                <Pressable 
                  style={[
                    styles.typeInput,
                    showDurationDropdown && styles.inputActive
                  ]}
                  onPress={() => setShowDurationDropdown(!showDurationDropdown)}
                >
                  <Text style={styles.typeInputText}>
                    {formData.plan_duration || 'Select duration'}
                  </Text>
                  <Ionicons 
                    name={showDurationDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </Pressable>
                
                {showDurationDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.typeList}>
                      {durations.map((duration) => (
                        <Pressable
                          key={duration}
                          style={styles.typeListItem}
                          onPress={() => {
                            handleChange('plan_duration', duration);
                            setShowDurationDropdown(false);
                          }}
                        >
                          <Text style={styles.typeListItemText}>{duration}</Text>
                          {formData.plan_duration === duration && (
                            <Ionicons name="checkmark" size={20} color="#8000ff" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 25 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(text) => handleChange('price', text)}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 20 }]}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter plan description"
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable 
              style={({pressed}) => [
                styles.submitButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={['#B721FF', '#8A2BE2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={styles.buttonContent}>
                  <AntDesign name="plus" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Create Plan</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable 
              style={({pressed}) => [
                styles.cancelButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => router.back()}
            >
              <LinearGradient
                colors={['#f8f9fa', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="close" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 120 : 100,
  },
  scrollContent: {
    paddingBottom: 30,
    position: 'relative',
    zIndex: 1,
  },
  formContainer: {
    padding: 12,
    paddingTop: 0,
    position: 'relative',
  },
  inputGroup: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 50,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    position: 'relative',
  },
  typeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  inputActive: {
    borderColor: '#8000ff',
    borderWidth: 1,
  },
  typeInputText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  typeList: {
    maxHeight: 200,
    zIndex: 10000,
  },
  typeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeListItemText: {
    fontSize: 16,
    color: '#333',
  },
  optionItemSelected: {
    backgroundColor: '#f8f0ff',
  },
  optionTextSelected: {
    color: '#8000ff',
    fontWeight: '500',
  },
  selectedObjectivesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedObjectiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 4,
  },
  selectedObjectiveText: {
    color: '#8000ff',
    fontSize: 14,
    marginRight: 4,
  },
  removeObjectiveButton: {
    padding: 2,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
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
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
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
  gradient: {
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    transform: [{scale: 0.98}],
    opacity: 0.95,
  },
  tableContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    position: 'relative',
    zIndex: 1,
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
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  dayContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  dayInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayInputActive: {
    borderColor: '#8000ff',
  },
  dayInputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  dayInputPlaceholder: {
    color: '#999',
  },
  optionsList: {
    maxHeight: 200,
    backgroundColor: '#fff',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
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
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  exercisesContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 15,
    padding: 15,
  },
  exercisesContent: {
    padding: 15,
  },
  noExercisesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 15,
  },
  setText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 5,
  },
  dayExercisesContainer: {
    marginTop: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setsContainer: {
    marginTop: 10,
  },
  setsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 14,
    color: '#666',
  },
  setReps: {
    fontSize: 14,
    color: '#8000ff',
    fontWeight: '500',
  },
  dayContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  addExerciseButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    paddingRight: 10,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  exerciseDropdownContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  exerciseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  exerciseInputActive: {
    borderColor: '#8000ff',
    borderWidth: 1,
  },
  exerciseInputText: {
    fontSize: 16,
    color: '#333',
  },
  exerciseInputPlaceholder: {
    color: '#999',
  },
  exerciseDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  exerciseDropdownScroll: {
    maxHeight: 200,
  },
  exerciseDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseDropdownItemSelected: {
    backgroundColor: '#f8f0ff',
  },
  exerciseDropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  setsRepsContainer: {
    marginBottom: 15,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  numberInputLabel: {
    fontSize: 16,
    color: '#333',
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
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
  saveButton: {
    backgroundColor: '#8000ff',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  exerciseInfo: {
    flex: 1,
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
  exercisesScrollView: {
    maxHeight: 200,
    marginBottom: 10,
  },
  exercisesTable: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  exerciseItem: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
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
  exerciseText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
    padding: 15,
  },
});
