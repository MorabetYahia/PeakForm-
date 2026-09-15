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
  RefreshControl,
  Modal,
  Pressable,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

interface NutritionSchedule {
  id: string;
  day: number;
  meal_type: string;
  food_item_id: string;
  quantity: number;
  created_at: string;
  client_plan_id: string;
  plan_id: string;
  coach_id: string;
  food_item?: {
    name: string;
    calories_per_unit: number;
    unit: string;
  };
}

interface FoodItem {
  id: string;
  name: string;
  calories_per_unit: number;
  unit: string;
}

const mealTypes = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Evening Snack'
];

export default function EditCustomNPlan() {
  const params = useLocalSearchParams();
  const { planId, clientId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<NutritionSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showMealTypeDropdown, setShowMealTypeDropdown] = useState(false);

  useEffect(() => {
    if (planId && clientId) {
      fetchNutritionSchedule();
      fetchFoodItems();
    }
  }, [planId, clientId]);

  const fetchFoodItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setFoodItems(data || []);
    } catch (error) {
      console.error('Error fetching food items:', error);
      Alert.alert('Error', 'Failed to load food items');
    }
  };

  const fetchNutritionSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: clientPlanData, error: clientPlanError } = await supabase
        .from('client_plan')
        .select('client_plan_id')
        .eq('plan_id', planId)
        .eq('client_id', clientId)
        .single();

      if (clientPlanError) throw clientPlanError;
      if (!clientPlanData) throw new Error('Client plan not found');

      const { data: existingSchedule, error: checkError } = await supabase
        .from('client_nutrition_schedule')
        .select('*')
        .eq('client_plan_id', clientPlanData.client_plan_id);

      if (checkError) throw checkError;

      if (!existingSchedule || existingSchedule.length === 0) {
        const { data: basePlan, error: basePlanError } = await supabase
          .from('nutrition_schedule')
          .select('*')
          .eq('plan_id', planId);

        if (basePlanError) throw basePlanError;

        if (basePlan && basePlan.length > 0) {
          const insertPromises = basePlan.map(meal => 
            supabase
              .from('client_nutrition_schedule')
              .insert({
                day: meal.day,
                meal_type: meal.meal_type,
                food_item_id: meal.food_item_id,
                quantity: meal.quantity,
                plan_id: planId,
                client_plan_id: clientPlanData.client_plan_id,
                coach_id: meal.coach_id
              })
          );

          await Promise.all(insertPromises);
        }
      }

      const { data, error } = await supabase
        .from('client_nutrition_schedule')
        .select(`
          *,
          food_item:food_items(*)
        `)
        .eq('client_plan_id', clientPlanData.client_plan_id)
        .order('day', { ascending: true });

      if (error) throw error;
      setSchedule(data || []);
    } catch (err) {
      console.error('Error in fetchNutritionSchedule:', err);
      setError('Failed to load nutrition schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: clientPlanData, error: clientPlanError } = await supabase
        .from('client_plan')
        .select('client_plan_id')
        .eq('plan_id', planId)
        .eq('client_id', clientId)
        .single();

      if (clientPlanError) throw clientPlanError;
      if (!clientPlanData) throw new Error('Client plan not found');

      for (const item of schedule) {
        const { error } = await supabase
          .from('client_nutrition_schedule')
          .update({
            day: item.day,
            meal_type: item.meal_type,
            food_item_id: item.food_item_id,
            quantity: item.quantity
          })
          .eq('id', item.id)
          .eq('client_plan_id', clientPlanData.client_plan_id);

        if (error) throw error;
      }

      Alert.alert('Success', 'Nutrition schedule updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating nutrition schedule:', error);
      Alert.alert('Error', 'Failed to update nutrition schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeal = async () => {
    if (!selectedFoodItem || !selectedMealType || !quantity) {
      Alert.alert('Error', 'Please fill in all fields');
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
        .from('client_nutrition_schedule')
        .insert({
          day: selectedDay,
          meal_type: selectedMealType,
          food_item_id: selectedFoodItem,
          quantity: parseInt(quantity),
          plan_id: planId,
          client_plan_id: clientPlanData.client_plan_id,
          coach_id: schedule[0]?.coach_id
        });

      if (error) throw error;

      setSelectedFoodItem('');
      setSelectedMealType('');
      setQuantity('');
      setShowAddModal(false);
      fetchNutritionSchedule();
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', 'Failed to add meal');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client_nutrition_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedule(schedule.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting meal:', error);
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchNutritionSchedule().finally(() => {
      setRefreshing(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading nutrition schedule...</Text>
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
          
          <Text style={styles.headerTitle}>Nutrition Plan</Text>
          
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
          <View style={styles.mealsContainer}>
            {schedule
              .filter(item => item.day === selectedDay)
              .map((item, index) => (
                <View key={item.id} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealNumber}>{index + 1}</Text>
                    <Text style={styles.mealType}>{item.meal_type}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMeal(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.mealDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Food Item</Text>
                      <Text style={styles.detailValue}>{item.food_item?.name}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => {
                          const newSchedule = schedule.map(s => 
                            s.id === item.id ? {...s, quantity: parseInt(text) || 0} : s
                          );
                          setSchedule(newSchedule);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Calories</Text>
                      <Text style={styles.detailValue}>
                        {item.food_item ? (item.food_item.calories_per_unit * item.quantity) : 0} kcal
                      </Text>
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
            <Text style={styles.addButtonText}>Add Meal</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Meal</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Meal Type</Text>
                  <Pressable 
                    style={[styles.dropdownInput, showMealTypeDropdown && styles.dropdownInputActive]}
                    onPress={() => setShowMealTypeDropdown(!showMealTypeDropdown)}
                  >
                    <Text style={[styles.dropdownInputText, !selectedMealType && styles.placeholderText]}>
                      {selectedMealType || 'Select Meal Type'}
                    </Text>
                    <Ionicons 
                      name={showMealTypeDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#666" 
                    />
                  </Pressable>
                  
                  {showMealTypeDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll}>
                        {mealTypes.map((type, index) => (
                          <Pressable
                            key={index}
                            style={[
                              styles.dropdownItem,
                              selectedMealType === type && styles.dropdownItemSelected
                            ]}
                            onPress={() => {
                              setSelectedMealType(type);
                              setShowMealTypeDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{type}</Text>
                            {selectedMealType === type && (
                              <Ionicons name="checkmark" size={20} color="#8000ff" />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Food Item</Text>
                  <Pressable 
                    style={[styles.dropdownInput, showFoodDropdown && styles.dropdownInputActive]}
                    onPress={() => setShowFoodDropdown(!showFoodDropdown)}
                  >
                    <Text style={[styles.dropdownInputText, !selectedFoodItem && styles.placeholderText]}>
                      {foodItems.find(item => item.id === selectedFoodItem)?.name || 'Select Food Item'}
                    </Text>
                    <Ionicons 
                      name={showFoodDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#666" 
                    />
                  </Pressable>
                  
                  {showFoodDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll}>
                        {foodItems.map((item) => (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.dropdownItem,
                              selectedFoodItem === item.id && styles.dropdownItemSelected
                            ]}
                            onPress={() => {
                              setSelectedFoodItem(item.id);
                              setShowFoodDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{item.name}</Text>
                            {selectedFoodItem === item.id && (
                              <Ionicons name="checkmark" size={20} color="#8000ff" />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      setQuantity(quantity);
                      Keyboard.dismiss();
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={() => Keyboard.dismiss()}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleAddMeal}
                >
                  <Text style={styles.submitButtonText}>Add Meal</Text>
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
  mealsContainer: {
    gap: 15,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealNumber: {
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
  mealType: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  mealDetails: {
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
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownInputActive: {
    borderColor: '#8000ff',
  },
  dropdownInputText: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  dropdownItemSelected: {
    backgroundColor: '#f8f0ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  doneButton: {
    backgroundColor: '#6C63FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 