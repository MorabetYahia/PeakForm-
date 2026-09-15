import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Platform, Image, Dimensions, ScrollView, ActivityIndicator, RefreshControl, Alert, Share } from 'react-native';
import { AntDesign, FontAwesome, MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import supabase from '../lib/supabase';

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
  coach_id: string;
  coach_name: string;
  coach_image: string;
}

export default function Tab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdowns, setActiveDropdowns] = useState<{ [key: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [tempPlans, setTempPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
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
        setIsLoading(false);
        return;
      }

      // Fetch plans with coach information
      const { data: plansData, error: plansError } = await supabase
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
        .eq('coach_id', coachData.coach_id)
        .order('created_at', { ascending: false });

      if (plansError) {
        console.error('Error fetching plans:', plansError);
        setIsLoading(false);
        return;
      }

      // Transform the data to match our Plan interface
      const transformedPlans = plansData.map(plan => ({
        ...plan,
        coach_name: plan.coach.user.Full_name,
        coach_image: plan.coach.user.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
      }));

      setPlans(transformedPlans);
      setTempPlans(transformedPlans);
    } catch (error) {
      console.error('Error in fetchPlans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('plan')
        .update({ status: newStatus })
        .eq('plan_id', planId);

      if (error) throw error;

      setPlans(prev => prev.map(plan => 
        plan.plan_id === planId ? { ...plan, status: newStatus } : plan
      ));
      setActiveDropdowns(prev => ({ ...prev, [planId]: false }));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleDropdown = (planId: string) => {
    setActiveDropdowns(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const handlePlanPress = (planId: string) => {
    router.push(`/plan/schedule?plan_id=${planId}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const handleDeletePlan = async (planId: string) => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
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
        return;
      }

      // First, delete all fitness schedules associated with this plan
      const { error: scheduleDeleteError } = await supabase
        .from('fitness_schedule')
        .delete()
        .eq('plan_id', planId);

      if (scheduleDeleteError) {
        console.error('Error deleting schedules:', scheduleDeleteError);
      }

      // Then delete the plan
      const { error: deleteError } = await supabase
        .from('plan')
        .delete()
        .eq('plan_id', planId)
        .eq('coach_id', coachData.coach_id);

      if (deleteError) {
        throw deleteError;
      }

      // Update the local state
      setPlans(prevPlans => prevPlans.filter(plan => plan.plan_id !== planId));
      setTempPlans(prevPlans => prevPlans.filter(plan => plan.plan_id !== planId));
    } catch (error) {
      console.error('Error deleting plan:', error);
      Alert.alert('Error', 'Failed to delete plan. Please try again.');
    }
  };

  const showDeleteConfirmation = (planId: string, planTitle: string) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${planTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePlan(planId),
        },
      ],
      { cancelable: true }
    );
  };

  const handleShare = async (plan: Plan) => {
    try {
      const shareMessage = `Check out this fitness plan: ${plan.title}\n\n` +
        `Type: ${plan.type}\n` +
        `Objective: ${plan.objective}\n` +
        `Price: $${plan.price}\n\n` +
        `Description: ${plan.description}`;

      const result = await Share.share({
        message: shareMessage,
        title: plan.title,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing plan:', error);
      Alert.alert('Error', 'Failed to share plan. Please try again.');
    }
  };

  if (isLoading && plans.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
        <View style={styles.statusBarSpace} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8000ff" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.statusBarSpace} />
      
      <ScrollView 
        style={styles.mainScrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8000ff']}
            tintColor="#8000ff"
            progressBackgroundColor="#ffffff"
          />
        }
      >
        <View style={styles.shadowContainer}>
          <Pressable 
            style={({pressed}) => [
              styles.createButtonContainer,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/plan/planform')}
          >
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.createButtonGradient}
            >
              <View style={styles.createButtonContent}>
                <View style={styles.createIconContainer}>
                  <AntDesign name="plus" size={24} color="#B721FF" />
                </View>
                <Text style={styles.createButtonText}>Create a new plan</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
        
        <View style={[styles.shadowContainer, styles.modifyShadowContainer]}>
          <Pressable 
            style={({pressed}) => [
              styles.createButtonContainer,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/plan/schedule')}
          >
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.createButtonGradient}
            >
              <View style={styles.createButtonContent}>
                <View style={styles.createIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color="#B721FF" />
                </View>
                <Text style={styles.createButtonText}>Modify Fitness Schedule</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
        
        <View style={[styles.shadowContainer, styles.modifyShadowContainer]}>
          <Pressable 
            style={({pressed}) => [
              styles.createButtonContainer,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/plan/nutrition_schedule')}
          >
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.createButtonGradient}
            >
              <View style={styles.createButtonContent}>
                <View style={styles.createIconContainer}>
                  <Ionicons name="nutrition-outline" size={24} color="#B721FF" />
                </View>
                <Text style={styles.createButtonText}>Modify Nutrition Schedule</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
        
        <View style={styles.plansContainer}>
          {(refreshing ? tempPlans : plans).map((plan) => (
            <Pressable 
              key={plan.plan_id}
              style={({pressed}) => [
                styles.planContainer,
                pressed && styles.planPressed
              ]}
              onPress={() => router.push(`/plan/clickableplan?id=${plan.plan_id}`)}
            >
              <LinearGradient
                colors={['#f8f9fa', '#ffffff']}
                style={styles.planGradient}
              >
                <View style={styles.planHeader}>
                  <View style={styles.coachInfo}>
                    <Image 
                      source={{ uri: plan.coach_image }} 
                      style={styles.coachImage}
                    />
                    <View style={styles.coachDetails}>
                      <View style={styles.nameRatingRow}>
                        <Text style={styles.coachName}>{plan.coach_name}</Text>
                        {plan.rating && (
                          <View style={styles.ratingContainer}>
                            <FontAwesome name="star" size={14} color="#FFD700" />
                            <Text style={styles.rating}>{plan.rating}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planName}>{plan.title}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.planDetailsContainer}>
                  <Text 
                    style={styles.planDetails}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {plan.description}
                  </Text>
                  <View style={styles.planStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="barbell-outline" size={16} color="#666" />
                      <Text style={styles.statText}>{plan.type}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="cash-outline" size={16} color="#666" />
                      <Text style={styles.statText}>${plan.price}</Text>
                    </View>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={true}
                      style={styles.objectiveScrollView}
                      contentContainerStyle={styles.objectiveContentContainer}
                    >
                      <View style={styles.statItem}>
                        <Ionicons name="trending-up-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{plan.objective}</Text>
                      </View>
                    </ScrollView>
                  </View>
                </View>
                
                <View style={styles.actionButtons}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => router.push({
                      pathname: '/plan/Editplan',
                      params: { plan_id: plan.plan_id }
                    })}
                  >
                    <MaterialIcons name="edit" size={20} color="#666" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => showDeleteConfirmation(plan.plan_id, plan.title)}
                  >
                    <Feather name="trash-2" size={20} color="#666" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </Pressable>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressed
                    ]}
                    onPress={() => handleShare(plan)}
                  >
                    <Feather name="share-2" size={20} color="#666" />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </Pressable>
                  <View style={styles.statusContainer}>
                    <Pressable 
                      style={[
                        styles.actionButton, 
                        styles.statusButton,
                        plan.status === 'public' ? styles.publicStatus : styles.privateStatus
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleDropdown(plan.plan_id);
                      }}
                    >
                      <Text style={[
                        styles.statusText,
                        plan.status === 'public' ? styles.publicText : styles.privateText
                      ]}>
                        {plan.status === 'public' ? 'Public' : 'Private'}
                      </Text>
                      <Feather 
                        name={activeDropdowns[plan.plan_id] ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color={plan.status === 'public' ? '#4CAF50' : '#F44336'} 
                        style={styles.dropdownIcon}
                      />
                    </Pressable>
                    
                    {activeDropdowns[plan.plan_id] && (
                      <View style={styles.dropdown}>
                        <Pressable 
                          style={[styles.dropdownOption, styles.publicOption]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleStatusChange(plan.plan_id, 'public');
                          }}
                        >
                          <Text style={styles.publicText}>Public</Text>
                          {plan.status === 'public' && (
                            <Feather name="check" size={16} color="#4CAF50" />
                          )}
                        </Pressable>
                        <Pressable 
                          style={[styles.dropdownOption, styles.privateOption]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleStatusChange(plan.plan_id, 'private');
                          }}
                        >
                          <Text style={styles.privateText}>Private</Text>
                          {plan.status === 'private' && (
                            <Feather name="check" size={16} color="#F44336" />
                          )}
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
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
  mainScrollView: {
    flex: 1,
  },
  shadowContainer: {
    margin: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  createButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonGradient: {
    padding: 16,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createIconContainer: {
    backgroundColor: 'rgba(183, 33, 255, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  planContainer: {
    margin: 12,
    borderRadius: 16,
  },
  planGradient: {
    borderRadius: 16,
    overflow: 'visible',
  },
  planHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
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
    flex: 1,
  },
  nameRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rating: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },
  planDetailsContainer: {
    padding: 16,
  },
  planDetails: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  objectiveScrollView: {
    maxWidth: width * 0.35,
  },
  objectiveContentContainer: {
    paddingRight: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  actionButtonText: {
    marginLeft: 3,
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statusContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: -90,
    right: 0,
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    zIndex: 1001,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  publicOption: {
    backgroundColor: '#E8F5E9',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  privateOption: {
    backgroundColor: '#FFEBEE',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  publicText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 13,
  },
  privateText: {
    color: '#F44336',
    fontWeight: '600',
    fontSize: 13,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 13,
  },
  publicStatus: {
    backgroundColor: '#E8F5E9',
  },
  privateStatus: {
    backgroundColor: '#FFEBEE',
  },
  planPressed: {
    transform: [{scale: 0.98}],
    opacity: 0.95,
  },
  modifyButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modifyButtonGradient: {
    padding: 16,
  },
  modifyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modifyIconContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modifyShadowContainer: {
    marginTop: -4,
    marginBottom: 8,
  },
  plansContainer: {
    paddingBottom: 20,
  },
  
});