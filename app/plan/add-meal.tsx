import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';

interface FoodItem {
  id: string;
  name: string;
  calories_per_unit: number;
  unit: string;
}

interface MealItem {
  food_item: FoodItem;
  quantity: string;
}

export default function AddMeal() {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState({
    type: '',
    items: [] as MealItem[]
  });
  const [loading, setLoading] = useState(true);

  const mealTypes = [
    'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'
  ];

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const fetchFoodItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*');

      if (error) {
        console.error('Error fetching food items:', error);
        Alert.alert('Error', 'Failed to load food items');
      } else if (data) {
        setFoodItems(data);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Error:', error.message);
      setLoading(false);
    }
  };

  const filteredFoodItems = foodItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFoodItem = () => {
    // Open dropdown to select a food item
    setShowDropdown(true);
  };

  const handleSelectFoodItem = (item: FoodItem) => {
    setSelectedMeal(prev => ({
      ...prev,
      items: [...prev.items, { food_item: item, quantity: '1' }]
    }));
    setShowDropdown(false);
  };

  const handleRemoveFoodItem = (index: number) => {
    setSelectedMeal(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleQuantityChange = (index: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setSelectedMeal(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, quantity: value } : item
        )
      }));
    }
  };

  const handleSelectMealType = (type: string) => {
    setSelectedMeal(prev => ({
      ...prev,
      type
    }));
  };

  const handleSave = async () => {
    if (!selectedMeal.type) {
      Alert.alert('Error', 'Please select a meal type');
      return;
    }

    if (selectedMeal.items.length === 0) {
      Alert.alert('Error', 'Please add at least one food item');
      return;
    }

    const allItemsValid = selectedMeal.items.every(item => 
      item.quantity && parseInt(item.quantity) > 0
    );
    
    if (!allItemsValid) {
      Alert.alert('Error', 'All food items must have a valid quantity');
      return;
    }

    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Authentication error:', authError);
        Alert.alert('Error', 'Please sign in to save meals');
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        Alert.alert('Error', 'Please sign in to save meals');
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
        Alert.alert('Error', 'You must be a registered coach to save meals');
        return;
      }

      // Check if plan_id is available in params
      if (!params.plan_id) {
        Alert.alert('Error', 'Plan ID is missing. Please try again.');
        return;
      }

      // Insert each food item as a separate record
      const mealPromises = selectedMeal.items.map(item => {
        const mealData = {
          day: parseInt(params.day as string),
          meal_type: selectedMeal.type,
          food_item_id: item.food_item.id,
          quantity: parseInt(item.quantity),
          coach_id: coachData.coach_id,
          plan_id: params.plan_id
        };

        return supabase
          .from('nutrition_schedule')
          .insert([mealData]);
      });

      const results = await Promise.all(mealPromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        console.error('Error saving meals:', errors);
        Alert.alert('Error', 'Failed to save some or all meals');
        return;
      }

      console.log('Successfully saved meals');

      // Format the meal data for returning to previous screen
      const formattedMealData = {
        type: selectedMeal.type,
        items: selectedMeal.items.map(item => ({
          name: item.food_item.name,
          quantity: item.quantity,
          unit: item.food_item.unit
        })),
        day: parseInt(params.day as string)
      };
      
      // Encode the data to ensure safe transmission
      const encodedData = encodeURIComponent(JSON.stringify(formattedMealData));
      
      // Set the params for the previous page
      router.setParams({ 
        savedMeal: encodedData,
        day: params.day,
        plan_id: params.plan_id as string
      });
      
      // Go back to the previous page
      router.back();
    } catch (error: any) {
      console.error('Error saving meal:', {
        error,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      });
      Alert.alert(
        'Error',
        `Failed to save meal: ${error?.message || 'Unknown error'}`
      );
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Meal</Text>
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Meal Type Selection */}
          <View style={styles.mealTypeContainer}>
            <Text style={styles.sectionTitle}>Meal Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.mealTypeScroll}
            >
              {mealTypes.map((type, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.mealTypeButton, 
                    selectedMeal.type === type && styles.selectedMealType
                  ]}
                  onPress={() => handleSelectMealType(type)}
                >
                  <Text style={[
                    styles.mealTypeText,
                    selectedMeal.type === type && styles.selectedMealTypeText
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Food Items Container */}
          <View style={styles.foodItemsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Food Items</Text>
              <Pressable
                style={styles.smallButton}
                onPress={handleAddFoodItem}
              >
                <LinearGradient
                  colors={['#B721FF', '#8A2BE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.smallButtonText}>Add Food</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {selectedMeal.items.map((item, index) => (
              <View key={index} style={styles.foodItem}>
                <View style={styles.foodItemInfo}>
                  <Text style={styles.foodItemName}>{item.food_item.name}</Text>
                  <Text style={styles.foodItemCalories}>
                    {item.food_item.calories_per_unit} cal/{item.food_item.unit}
                  </Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={(text) => handleQuantityChange(index, text)}
                    placeholder="Qty"
                  />
                  <Text style={styles.unitText}>{item.food_item.unit}</Text>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveFoodItem(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Food Items Dropdown */}
            {showDropdown && (
              <View style={styles.dropdownContainer}>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search food items..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                  />
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                </View>
                <ScrollView style={styles.dropdownScroll}>
                  {loading ? (
                    <Text style={styles.loadingText}>Loading food items...</Text>
                  ) : filteredFoodItems.length > 0 ? (
                    filteredFoodItems.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectFoodItem(item)}
                      >
                        <View>
                          <Text style={styles.dropdownItemText}>{item.name}</Text>
                          <Text style={styles.dropdownItemSubtext}>
                            {item.calories_per_unit} cal/{item.unit}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={24} color="#8000ff" />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.noResultsText}>No food items found</Text>
                  )}
                </ScrollView>
                <Pressable 
                  style={styles.closeDropdownButton}
                  onPress={() => setShowDropdown(false)}
                >
                  <Text style={styles.closeDropdownText}>Close</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Total Calories */}
          <View style={styles.totalCaloriesContainer}>
            <Text style={styles.totalCaloriesLabel}>Total Calories:</Text>
            <Text style={styles.totalCaloriesValue}>
              {selectedMeal.items.reduce((total, item) => {
                const quantity = parseInt(item.quantity) || 0;
                return total + (quantity * item.food_item.calories_per_unit);
              }, 0)}
            </Text>
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
  mealTypeContainer: {
    marginBottom: 20,
  },
  mealTypeScroll: {
    marginTop: 10,
  },
  mealTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    ...commonShadow,
  },
  selectedMealType: {
    backgroundColor: '#8000ff',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#333',
  },
  selectedMealTypeText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionHeader: {
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
  foodItemsContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    ...commonShadow,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  foodItemCalories: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    width: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  unitText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
    width: 40,
  },
  removeButton: {
    padding: 5,
    marginLeft: 5,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 1000,
    ...commonShadow,
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
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  noResultsText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  closeDropdownButton: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  closeDropdownText: {
    color: '#8000ff',
    fontWeight: '500',
  },
  totalCaloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalCaloriesLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 5,
  },
  totalCaloriesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8000ff',
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
});