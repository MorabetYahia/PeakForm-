import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';

interface Set {
  reps: string;
}

export default function AddExercise() {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState({
    name: '',
    sets: [] as Set[]
  });

  const exercises = [
    'Push-ups', 'Pull-ups', 'Rest day','Squats', 'Deadlifts', 'Bench Press', 'Shoulder Press',
    'Bicep Curls', 'Tricep Dips', 'Lunges', 'Plank', 'Mountain Climbers', 'Burpees',
    'Russian Twists', 'Leg Press', 'Lat Pulldown', 'Chest Fly', 'Leg Curls',
    'Calf Raises', 'Box Jumps', 'Kettlebell Swings'
  ];

  const filteredExercises = exercises.filter(exercise =>
    exercise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSet = () => {
    setSelectedExercise(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: '' }]
    }));
  };

  const handleRemoveSet = (index: number) => {
    setSelectedExercise(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }));
  };

  const handleSetChange = (index: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setSelectedExercise(prev => ({
        ...prev,
        sets: prev.sets.map((set, i) => 
          i === index ? { ...set, reps: value } : set
        )
      }));
    }
  };

  const handleSave = async () => {
    if (selectedExercise.name && selectedExercise.sets.length > 0) {
      const allSetsValid = selectedExercise.sets.every(set => 
        set.reps && parseInt(set.reps) > 0
      );
      
      if (allSetsValid) {
        try {
          // Get the current user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError) {
            console.error('Authentication error:', authError);
            Alert.alert('Error', 'Please sign in to save exercises');
            return;
          }

          if (!user) {
            console.error('No authenticated user found');
            Alert.alert('Error', 'Please sign in to save exercises');
            return;
          }

          // Check if user exists in coach table and get their UUID
          const { data: coachData, error: coachError } = await supabase
            .from('coach')
            .select('coach_id')
            .eq('user_id', user.id)
            .single();

          if (coachError || !coachData) {
            console.error('Coach not found:', coachError);
            Alert.alert('Error', 'You must be a registered coach to save exercises');
            return;
          }

          // Combine all repetitions into a comma-separated string
          const repetitions = selectedExercise.sets
            .map(set => set.reps)
            .join(',');

          // Check if plan_id is available in params
          if (!params.plan_id) {
            Alert.alert('Error', 'Plan ID is missing. Please try again.');
            return;
          }

          // Create a record with combined repetitions including plan_id
          const exerciseData = {
            day: parseInt(params.day as string),
            exercise: selectedExercise.name,
            number_of_sets: selectedExercise.sets.length,
            number_of_repetition: repetitions,
            coach_id: coachData.coach_id,
            plan_id: params.plan_id
          };

          console.log('Saving exercise with plan_id:', params.plan_id);

          const { data, error } = await supabase
            .from('fitness_schedule')
            .insert([exerciseData])
            .select();

          if (error) {
            console.error('Error saving exercise:', error);
            Alert.alert('Error', 'Failed to save exercise: ' + error.message);
            return;
          }

          console.log('Successfully saved exercise:', data);

          // Format the exercise data with sets and reps
          const formattedExerciseData = {
            name: selectedExercise.name,
            sets: selectedExercise.sets.map(set => set.reps),
            day: parseInt(params.day as string)
          };
          
          // Encode the data to ensure safe transmission
          const encodedData = encodeURIComponent(JSON.stringify(formattedExerciseData));
          
          // Set the params for the previous page
          router.setParams({ 
            savedExercise: encodedData,
            day: params.day,
            plan_id: params.plan_id as string
          });
          
          // Go back to the previous page
          router.back();
        } catch (error: any) {
          console.error('Error saving exercise:', {
            error,
            errorMessage: error?.message,
            errorDetails: error?.details,
            errorHint: error?.hint
          });
          Alert.alert(
            'Error',
            `Failed to save exercise: ${error?.message || 'Unknown error'}`
          );
        }
      }
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Exercise</Text>
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.exerciseDropdownContainer}>
            <Pressable 
              style={[styles.input, showDropdown && styles.inputActive]}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={[styles.inputText, !selectedExercise.name && styles.placeholderText]}>
                {selectedExercise.name || 'Select Exercise'}
              </Text>
              <Ionicons 
                name={showDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666" 
              />
            </Pressable>
            
            {showDropdown && (
              <View style={styles.dropdownList}>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                  />
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                </View>
                <ScrollView style={styles.dropdownScroll}>
                  {filteredExercises.map((exercise, index) => (
                    <Pressable
                      key={index}
                      style={[styles.dropdownItem, selectedExercise.name === exercise && styles.selectedItem]}
                      onPress={() => {
                        setSelectedExercise(prev => ({ ...prev, name: exercise }));
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{exercise}</Text>
                      {selectedExercise.name === exercise && (
                        <Ionicons name="checkmark" size={20} color="#8000ff" />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.setsContainer}>
            <View style={styles.setsHeader}>
              <Text style={styles.sectionTitle}>Sets</Text>
              <Pressable
                style={styles.smallButton}
                onPress={handleAddSet}
              >
                <LinearGradient
                  colors={['#B721FF', '#8A2BE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.smallButtonText}>Add Set</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {selectedExercise.sets.map((set, index) => (
              <View key={index} style={styles.setItem}>
                <Text style={styles.setNumber}>Set {index + 1}</Text>
                <View style={styles.setInputContainer}>
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(text) => handleSetChange(index, text)}
                    placeholder="Reps"
                  />
                  <Pressable
                    style={styles.removeSetButton}
                    onPress={() => handleRemoveSet(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <LinearGradient
                colors={['#B721FF', '#8A2BE2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const commonShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 3,
  },
});

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
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseDropdownContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    ...commonShadow,
  },
  inputActive: {
    borderColor: '#8000ff',
    borderWidth: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 300,
    zIndex: 1000,
    ...commonShadow,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#f8f0ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  searchContainer: {
    position: 'relative',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    paddingLeft: 40,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 20,
    top: 20,
  },
  setsContainer: {
    marginBottom: 20,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  smallButton: {
    width: 100,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  setItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    ...commonShadow,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: 60,
  },
  setInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 10,
  },
  removeSetButton: {
    padding: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});