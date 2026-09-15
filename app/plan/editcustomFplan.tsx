import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Linking,
  RefreshControl,
  Modal,
  Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

interface FitnessSchedule {
  id: number;
  day: number;
  exercise: string;
  number_of_sets: number;
  number_of_repetition: string;
  created_at: string;
  client_plan_id: string;
  plan_id: string;
  coach_id: string;
}

const exercises = [
  'Push-ups',
  'Pull-ups',
  'Squats',
  'Deadlifts',
  'Bench Press',
  'Shoulder Press',
  'Lunges',
  'Plank',
  'Burpees',
  'Mountain Climbers'
];

interface Set {
  reps: string;
}

interface NewExercise {
  name: string;
  sets: Set[];
}

export default function EditCustomFPlan() {
  const params = useLocalSearchParams();
  const { planId, clientId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<FitnessSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [sets, setSets] = useState<Set[]>([{ reps: '' }]);

  useEffect(() => {
    if (planId && clientId) {
      fetchFitnessSchedule();
    }
  }, [planId, clientId]);

  const fetchFitnessSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the client_plan_id using both client_id and plan_id
      const { data: clientPlanData, error: clientPlanError } = await supabase
        .from('client_plan')
        .select('client_plan_id')
        .eq('plan_id', planId)
        .eq('client_id', clientId)
        .single();

      if (clientPlanError) {
        console.error('Error fetching client plan:', clientPlanError);
        throw clientPlanError;
      }
      if (!clientPlanData) {
        throw new Error('Client plan not found');
      }

      console.log('Client Plan ID:', clientPlanData.client_plan_id);

      // Check if client already has a fitness schedule
      const { data: existingSchedule, error: checkError } = await supabase
        .from('client_fitness_schedule')
        .select('*')
        .eq('client_plan_id', clientPlanData.client_plan_id);

      if (checkError) {
        console.error('Error checking existing schedule:', checkError);
        throw checkError;
      }

      // If no schedule exists, copy from base plan
      if (!existingSchedule || existingSchedule.length === 0) {
        // Get the base plan data
        const { data: basePlan, error: basePlanError } = await supabase
          .from('fitness_schedule')
          .select('*')
          .eq('plan_id', planId);

        if (basePlanError) {
          console.error('Error fetching base plan:', basePlanError);
          throw basePlanError;
        }

        if (basePlan && basePlan.length > 0) {
          // Insert each exercise into client_fitness_schedule
          const insertPromises = basePlan.map(exercise => 
            supabase
              .from('client_fitness_schedule')
              .insert({
                day: exercise.day,
                exercise: exercise.exercise,
                number_of_sets: exercise.number_of_sets,
                number_of_repetition: exercise.number_of_repetition,
                plan_id: planId,
                client_plan_id: clientPlanData.client_plan_id,
                coach_id: exercise.coach_id
              })
          );

          await Promise.all(insertPromises);
        }
      }

      // Fetch the client's fitness schedule
      const { data, error } = await supabase
        .from('client_fitness_schedule')
        .select(`
          id,
          day,
          exercise,
          number_of_sets,
          number_of_repetition,
          created_at,
          client_plan_id,
          plan_id,
          coach_id
        `)
        .eq('client_plan_id', clientPlanData.client_plan_id)
        .order('day', { ascending: true });

      if (error) {
        console.error('Error fetching fitness schedule:', error);
        throw error;
      }

      console.log('Fitness Schedule Data:', data);
      setSchedule(data || []);
    } catch (err) {
      console.error('Error in fetchFitnessSchedule:', err);
      setError('Failed to load fitness schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First, get the client_plan_id again to ensure we're updating the correct plan
      const { data: clientPlanData, error: clientPlanError } = await supabase
        .from('client_plan')
        .select('client_plan_id')
        .eq('plan_id', planId)
        .eq('client_id', clientId)
        .single();

      if (clientPlanError) throw clientPlanError;
      if (!clientPlanData) throw new Error('Client plan not found');

      // Update each fitness schedule item
      for (const item of schedule) {
        const { error } = await supabase
          .from('client_fitness_schedule')
          .update({
            day: item.day,
            exercise: item.exercise,
            number_of_sets: item.number_of_sets,
            number_of_repetition: item.number_of_repetition
          })
          .eq('id', item.id)
          .eq('client_plan_id', clientPlanData.client_plan_id);

        if (error) throw error;
      }

      Alert.alert('Success', 'Fitness schedule updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating fitness schedule:', error);
      Alert.alert('Error', 'Failed to update fitness schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSet = () => {
    setSets([...sets, { reps: '' }]);
  };

  const handleRemoveSet = (index: number) => {
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
  };

  const handleSetChange = (index: number, value: string) => {
    const newSets = [...sets];
    newSets[index].reps = value;
    setSets(newSets);
  };

  const handleAddExercise = async () => {
    if (!selectedExercise || sets.length === 0) {
      Alert.alert('Error', 'Please select an exercise and add at least one set');
      return;
    }

    try {
      const { data: clientPlanData } = await supabase
        .from('client_plan')
        .select('client_plan_id')
        .eq('plan_id', planId)
        .eq('client_id', clientId)
        .single();

      if (!clientPlanData) throw new Error('Client plan not found');

      const { error } = await supabase
        .from('client_fitness_schedule')
        .insert({
          day: selectedDay,
          exercise: selectedExercise,
          number_of_sets: sets.length,
          number_of_repetition: sets.map(set => set.reps).join(', '),
          plan_id: planId,
          client_plan_id: clientPlanData.client_plan_id,
          coach_id: schedule[0]?.coach_id
        });

      if (error) throw error;

      setSelectedExercise('');
      setSets([{ reps: '' }]);
      setShowAddModal(false);
      fetchFitnessSchedule();
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const handleDeleteExercise = async (id: number) => {
    try {
      const { error } = await supabase
        .from('client_fitness_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedule(schedule.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Alert.alert('Error', 'Failed to delete exercise');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchFitnessSchedule().finally(() => {
      setRefreshing(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading fitness schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#6C63FF', '#8000FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Fitness Plan</Text>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.daySelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDay === day && styles.selectedDayButton
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === day && styles.selectedDayButtonText
                ]}>
                  Day {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6C63FF']}
              tintColor="#6C63FF"
              progressBackgroundColor="#fff"
            />
          }
        >
          <View style={styles.exercisesContainer}>
            {schedule
              .filter(item => item.day === selectedDay)
              .map((item, index) => (
                <View key={item.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                    <TextInput
                      style={styles.exerciseName}
                      value={item.exercise}
                      onChangeText={(text) => {
                        const newSchedule = schedule.map(s => 
                          s.id === item.id ? {...s, exercise: text} : s
                        );
                        setSchedule(newSchedule);
                      }}
                      placeholder="Exercise name"
                    />
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteExercise(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.exerciseDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Sets</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={item.number_of_sets.toString()}
                        onChangeText={(text) => {
                          const newSchedule = schedule.map(s => 
                            s.id === item.id ? {...s, number_of_sets: parseInt(text) || 0} : s
                          );
                          setSchedule(newSchedule);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reps</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={item.number_of_repetition}
                        onChangeText={(text) => {
                          const newSchedule = schedule.map(s => 
                            s.id === item.id ? {...s, number_of_repetition: text} : s
                          );
                          setSchedule(newSchedule);
                        }}
                        placeholder="0"
                      />
                    </View>
                  </View>
                </View>
              ))}
          </View>

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add Exercise Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Exercise</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.exerciseDropdownContainer}>
                  <Pressable 
                    style={[styles.exerciseInput, showExerciseDropdown && styles.exerciseInputActive]}
                    onPress={() => setShowExerciseDropdown(!showExerciseDropdown)}
                  >
                    <Text style={[styles.exerciseInputText, !selectedExercise && styles.placeholderText]}>
                      {selectedExercise || 'Select Exercise'}
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
                              selectedExercise === exercise && styles.exerciseDropdownItemSelected
                            ]}
                            onPress={() => {
                              setSelectedExercise(exercise);
                              setShowExerciseDropdown(false);
                            }}
                          >
                            <Text style={styles.exerciseDropdownItemText}>{exercise}</Text>
                            {selectedExercise === exercise && (
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
                    <TouchableOpacity
                      style={styles.addSetButton}
                      onPress={handleAddSet}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                  </View>

                  {sets.map((set, index) => (
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
                        <TouchableOpacity
                          style={styles.removeSetButton}
                          onPress={() => handleRemoveSet(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleAddExercise}
                >
                  <Text style={styles.submitButtonText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  daySelector: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  selectedDayButton: {
    backgroundColor: '#6C63FF',
  },
  dayButtonText: {
    fontSize: 16,
    color: '#666',
  },
  selectedDayButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exercisesContainer: {
    gap: 15,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciseNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6C63FF',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
    marginRight: 10,
    fontWeight: 'bold',
  },
  exerciseName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  exerciseDropdownContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  exerciseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exerciseInputActive: {
    borderColor: '#8000ff',
  },
  exerciseInputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
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
    maxHeight: 300,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseDropdownScroll: {
    maxHeight: 200,
  },
  exerciseDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
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
    fontWeight: 'bold',
    color: '#333',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8000ff',
    padding: 8,
    borderRadius: 5,
  },
  addSetButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
  },
  setItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  setNumber: {
    width: 60,
    fontSize: 14,
    color: '#666',
  },
  setInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 8,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeSetButton: {
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#8000ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
