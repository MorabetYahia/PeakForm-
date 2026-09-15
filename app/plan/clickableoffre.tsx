import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, StatusBar, Platform, ActivityIndicator, Pressable, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '../lib/supabase';
import { BlurView } from 'expo-blur';
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

export default function ClickablePlan() {
  const { id } = useLocalSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [fitnessSchedule, setFitnessSchedule] = useState<FitnessSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPlanDetails();
    }
  }, [id]);

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

      // Transform the data to match our Plan interface
      const transformedPlan = {
        ...planData,
        coach_name: planData.coach.user.Full_name,
        coach_image: planData.coach.user.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
      };

      setPlan(transformedPlan);

      // If it's a fitness plan, fetch the fitness schedule
      if (planData.type === 'fitness' || planData.type === 'fitness & nutrition') {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('fitness_schedule')
          .select('*')
          .eq('plan_id', id)
          .order('day', { ascending: true });

        if (!scheduleError) {
          setFitnessSchedule(scheduleData);
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
      setIsLoading(true);
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get the client's ID
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.error('Error fetching client data:', clientError);
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
        setIsLoading(false);
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
          setIsLoading(false);
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
        setIsLoading(false);
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
        setIsLoading(false);
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
      router.push('/(tabsclient)/suivi');
      
    } catch (error) {
      console.error('Error in handlePurchase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#8000ff" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
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
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.statusBarSpace} />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView}>
        <LinearGradient
          colors={['#f8f9fa', '#ffffff']}
          style={styles.gradient}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.coachInfo}>
              <Image 
                source={{ uri: plan.coach_image }} 
                style={styles.coachImage}
              />
              <View style={styles.coachDetails}>
                <Text style={styles.coachName}>{plan.coach_name}</Text>
                {plan.rating && (
                  <View style={styles.ratingContainer}>
                    <FontAwesome name="star" size={14} color="#FFD700" />
                    <Text style={styles.rating}>{plan.rating}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.planName}>{plan.title}</Text>
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
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={20} color="#666" />
                <Text style={styles.statText}>${plan.price}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={20} color="#666" />
                <Text style={styles.statText}>{plan.type}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={20} color="#666" />
                <Text style={styles.statText}>{plan.objective}</Text>
              </View>
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
                numberOfLines={showFullDescription ? undefined : 7}
                ellipsizeMode="tail"
              >
                {plan.description}
              </Text>
              {plan.description.length > 350 && (
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Schedule</Text>
            <View style={styles.blurredContainer}>
              <View style={styles.blurOverlay} />
              <View style={styles.premiumFeaturesContainer}>
                <View style={styles.premiumFeaturesBox}>
                  <View style={styles.premiumHeader}>
                    <Ionicons name="lock-closed" size={24} color="#8000ff" />
                    <Text style={styles.premiumTitle}>Premium Features</Text>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="barbell" size={20} color="#8000ff" />
                      <Text style={styles.featureText}>Detailed workout schedule</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="chatbubble-ellipses" size={20} color="#8000ff" />
                      <Text style={styles.featureText}>Direct chat with your coach</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="person" size={20} color="#8000ff" />
                      <Text style={styles.featureText}>Personalized guidance</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.buyNowButton}
                    onPress={handlePurchase}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#8000ff', '#6000cc']}
                      style={styles.gradientButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <React.Fragment>
                          <Text style={styles.buyNowText}>Buy Now</Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                        </React.Fragment>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

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
    </View>
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
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  coachInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  coachImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
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
    alignItems: 'center',
  },
  coachName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  detailsSection: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
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
    borderWidth: 1,
    borderColor: 'rgba(128, 0, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: 'rgba(128, 0, 255, 0.02)',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128, 0, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 0, 255, 0.1)',
  },
  headerCell: {
    flex: 1,
    padding: 12,
    fontWeight: 'bold',
    color: '#8000ff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 0, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    color: '#333',
    textAlign: 'center',
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
  backButton: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  blurredContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    height: 400,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    zIndex: 1,
  },
  premiumFeaturesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  premiumFeaturesBox: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8000ff',
    marginLeft: 10,
  },
  featuresList: {
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(128, 0, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 15,
  },
  featureText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buyNowButton: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#8000ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonIcon: {
    marginLeft: 5,
  },
});
