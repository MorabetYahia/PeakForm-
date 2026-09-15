import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';

// Define the ClientDetails interface
interface ClientDetails {
  client_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  weight: string;
  height: string;
  profile_image: string;
  objective: string;
  plans: {
    fitness?: {
      plan_id: string;
      name: string;
      description: string;
      duration: string;
      price: number;
      start_date: string;
      end_date: string;
      status: string;
      type: string;
      level: string;
    };
    nutrition?: {
      plan_id: string;
      name: string;
      description: string;
      duration: string;
      price: number;
      start_date: string;
      end_date: string;
      status: string;
      type: string;
      level: string;
    };
  };
}

export default function ClickableClient() {
  const params = useLocalSearchParams();
  const clientId = params.clientId as string;
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("Client ID received:", clientId);
    if (clientId) {
      fetchClientDetails(clientId);
    } else {
      console.error("No client ID provided");
      setLoading(false);
    }
  }, [clientId]);

  // Function to fetch detailed client information
  const fetchClientDetails = async (clientId: string) => {
    setLoading(true);
    try {
      console.log("Fetching client details for ID:", clientId);
      
      // Get client details with user information
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select(`
          client_id,
          user_id,
          user:user_id (
            Full_name,
            email,
            profile_image,
            phone_number,
            gender,
            address,
            weight,
            height
          )
        `)
        .eq('client_id', clientId)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
        setLoading(false);
        return;
      }

      if (!clientData) {
        console.error('No client data found for ID:', clientId);
        setLoading(false);
        return;
      }

      console.log("Client data found:", clientData);

      // Get client's plans with detailed plan information
      const { data: clientPlansData, error: clientPlansError } = await supabase
        .from('client_plan')
        .select(`
          client_plan_id,
          plan_id,
          purchase_date,
          expiration_date,
          plan:plan_id (
            plan_id,
            title,
            objective,
            type,
            price,
            description,
            plan_duration,
            level
          )
        `)
        .eq('client_id', clientId)
        .order('purchase_date', { ascending: false });

      if (clientPlansError) {
        console.error('Error fetching client plans:', clientPlansError);
      }

      console.log("Fetched plans data:", clientPlansData);

      const userData = clientData.user as any;
      
      // Create client details object
      const clientDetails: ClientDetails = {
        client_id: clientData.client_id,
        user_id: clientData.user_id,
        full_name: userData.Full_name,
        email: userData.email || 'N/A',
        phone: userData.phone_number || 'N/A',
        gender: userData.gender || 'N/A',
        address: userData.address || 'N/A',
        weight: userData.weight || 'N/A',
        height: userData.height || 'N/A',
        profile_image: userData.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
        objective: 'Not specified',
        plans: {
          fitness: undefined,
          nutrition: undefined
        }
      };

      // If plan data exists, update the client details
      if (clientPlansData && !clientPlansError) {
        console.log("Processing plan data:", clientPlansData);
        
        clientPlansData.forEach((clientPlan: any) => {
          const plan = clientPlan.plan as any;
          console.log("Processing plan:", plan);
          
          // Format dates
          const startDate = new Date(clientPlan.purchase_date);
          const endDate = clientPlan.expiration_date ? new Date(clientPlan.expiration_date) : new Date(startDate);
          
          // If no expiration date is set, calculate it based on plan duration
          if (!clientPlan.expiration_date && plan.plan_duration) {
            const durationMonths = parseInt(plan.plan_duration);
            endDate.setMonth(endDate.getMonth() + durationMonths);
          }

          const planDetails = {
            plan_id: plan.plan_id,
            name: plan.title || 'Unnamed Plan',
            description: plan.description || 'No description available',
            duration: plan.plan_duration || '0',
            price: plan.price || 0,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'Active',
            type: plan.type || 'N/A',
            level: plan.level || 'N/A'
          };

          console.log("Plan type:", plan.type);
          console.log("Plan details:", planDetails);

          // Assign to appropriate plan type
          if (plan.type && plan.type.toLowerCase() === 'fitness') {
            console.log("Assigning fitness plan");
            clientDetails.plans.fitness = planDetails;
          } else if (plan.type && plan.type.toLowerCase() === 'nutrition') {
            console.log("Assigning nutrition plan");
            clientDetails.plans.nutrition = planDetails;
          }
        });
      } else {
        console.log("No plan data found for client");
      }

      console.log("Final client details with plans:", clientDetails);
      setClient(clientDetails);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle edit plan
  const handleEditPlan = (planId: string, planType: string) => {
    if (!client) return;
    
    if (planType.toLowerCase() === 'nutrition') {
      router.push({
        pathname: '/plan/editcustomNplan',
        params: { 
          planId: planId,
          clientId: client.client_id
        }
      });
    } else if (planType.toLowerCase() === 'fitness') {
      router.push({
        pathname: '/plan/editcustomFplan',
        params: { 
          planId: planId,
          clientId: client.client_id
        }
      });
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (dateString === 'N/A') return dateString;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Function to calculate progress
  const calculateProgress = (plan: any) => {
    if (!plan || plan.start_date === 'N/A' || plan.end_date === 'N/A') {
      return 0;
    }

    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);
    const today = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    
    let progress = (elapsed / totalDuration) * 100;
    
    // Clamp progress between 0 and 100
    progress = Math.max(0, Math.min(100, progress));
    
    return progress;
  };

  // Function to toggle description visibility
  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.loadingText}>Loading client details...</Text>
          </View>
        ) : client ? (
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header with client image and basic info */}
            <LinearGradient
              colors={['#6C63FF', '#8000FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <MotiView
                  from={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'timing', duration: 500 }}
                >
                  <Image 
                    source={{ uri: client.profile_image }}
                    style={styles.profileImage}
                  />
                </MotiView>
                
                <MotiView
                  from={{ translateY: 20, opacity: 0 }}
                  animate={{ translateY: 0, opacity: 1 }}
                  transition={{ type: 'timing', duration: 500, delay: 200 }}
                >
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </MotiView>
              </View>
            </LinearGradient>
            
            {/* Client Info Section */}
            <MotiView
              from={{ translateY: 50, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: 'timing', duration: 500, delay: 400 }}
              style={styles.infoCard}
            >
              <View style={styles.infoHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#6C63FF" />
                <Text style={styles.infoTitle}>Client Information</Text>
              </View>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{client.full_name}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{client.email}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{client.phone}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{client.gender}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{client.address}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Weight</Text>
                  <Text style={styles.infoValue}>{client.weight}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Height</Text>
                  <Text style={styles.infoValue}>{client.height}</Text>
                </View>
              </View>
            </MotiView>
            
            {/* Plans Section */}
            <View style={styles.plansContainer}>
              <Text style={styles.sectionTitle}>Client Plans</Text>
              
              {/* Fitness Plan Section */}
              {client.plans.fitness && (
                <MotiView
                  from={{ translateY: 50, opacity: 0 }}
                  animate={{ translateY: 0, opacity: 1 }}
                  transition={{ type: 'timing', duration: 500, delay: 600 }}
                  style={styles.planCard}
                >
                  <View style={styles.planHeader}>
                    <Ionicons name="fitness-outline" size={24} color="#6C63FF" />
                    <Text style={styles.planTitle}>Fitness Plan</Text>
                  </View>
                  
                  <View style={styles.planProgressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${calculateProgress(client.plans.fitness!)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(calculateProgress(client.plans.fitness!))}% Complete</Text>
                  </View>
                  
                  <View style={styles.planDetails}>
                    <View style={styles.planItem}>
                      <Text style={styles.planItemLabel}>Plan Name</Text>
                      <Text style={styles.planItemValue}>{client.plans.fitness!.name}</Text>
                    </View>
                    
                    <View style={styles.planItem}>
                      <Text style={styles.planItemLabel}>Description</Text>
                      <View style={styles.descriptionContainer}>
                        <Text 
                          style={[
                            styles.planItemValue, 
                            !showFullDescription && styles.descriptionTruncated
                          ]}
                          numberOfLines={showFullDescription ? undefined : 4}
                        >
                          {client.plans.fitness!.description}
                        </Text>
                        {client.plans.fitness!.description && client.plans.fitness!.description.length > 150 && (
                          <TouchableOpacity 
                            style={styles.readMoreButton}
                            onPress={toggleDescription}
                          >
                            <Text style={styles.readMoreText}>
                              {showFullDescription ? 'Read Less' : 'Read More'}
                            </Text>
                            <Ionicons 
                              name={showFullDescription ? 'chevron-up' : 'chevron-down'} 
                              size={16} 
                              color="#6C63FF" 
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Type</Text>
                        <Text style={styles.planItemValue}>{client.plans.fitness!.type}</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Level</Text>
                        <Text style={styles.planItemValue}>{client.plans.fitness!.level}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Duration</Text>
                        <Text style={styles.planItemValue}>{client.plans.fitness!.duration} months</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Price</Text>
                        <Text style={styles.planItemValue}>${client.plans.fitness!.price}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Start Date</Text>
                        <Text style={styles.planItemValue}>{formatDate(client.plans.fitness!.start_date)}</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>End Date</Text>
                        <Text style={styles.planItemValue}>{formatDate(client.plans.fitness!.end_date)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditPlan(client.plans.fitness!.plan_id, 'fitness')}
                  >
                    <LinearGradient
                      colors={['#6C63FF', '#8000FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editButtonGradient}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.editButtonText}>Edit Fitness Plan</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </MotiView>
              )}

              {/* Nutrition Plan Section */}
              {client.plans.nutrition && (
                <MotiView
                  from={{ translateY: 50, opacity: 0 }}
                  animate={{ translateY: 0, opacity: 1 }}
                  transition={{ type: 'timing', duration: 500, delay: 800 }}
                  style={styles.planCard}
                >
                  <View style={styles.planHeader}>
                    <Ionicons name="nutrition-outline" size={24} color="#6C63FF" />
                    <Text style={styles.planTitle}>Nutrition Plan</Text>
                  </View>
                  
                  <View style={styles.planProgressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${calculateProgress(client.plans.nutrition!)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(calculateProgress(client.plans.nutrition!))}% Complete</Text>
                  </View>
                  
                  <View style={styles.planDetails}>
                    <View style={styles.planItem}>
                      <Text style={styles.planItemLabel}>Plan Name</Text>
                      <Text style={styles.planItemValue}>{client.plans.nutrition!.name}</Text>
                    </View>
                    
                    <View style={styles.planItem}>
                      <Text style={styles.planItemLabel}>Description</Text>
                      <View style={styles.descriptionContainer}>
                        <Text 
                          style={[
                            styles.planItemValue, 
                            !showFullDescription && styles.descriptionTruncated
                          ]}
                          numberOfLines={showFullDescription ? undefined : 4}
                        >
                          {client.plans.nutrition!.description}
                        </Text>
                        {client.plans.nutrition!.description && client.plans.nutrition!.description.length > 150 && (
                          <TouchableOpacity 
                            style={styles.readMoreButton}
                            onPress={toggleDescription}
                          >
                            <Text style={styles.readMoreText}>
                              {showFullDescription ? 'Read Less' : 'Read More'}
                            </Text>
                            <Ionicons 
                              name={showFullDescription ? 'chevron-up' : 'chevron-down'} 
                              size={16} 
                              color="#6C63FF" 
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Type</Text>
                        <Text style={styles.planItemValue}>{client.plans.nutrition!.type}</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Level</Text>
                        <Text style={styles.planItemValue}>{client.plans.nutrition!.level}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Duration</Text>
                        <Text style={styles.planItemValue}>{client.plans.nutrition!.duration} months</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Price</Text>
                        <Text style={styles.planItemValue}>${client.plans.nutrition!.price}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.planItemRow}>
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>Start Date</Text>
                        <Text style={styles.planItemValue}>{formatDate(client.plans.nutrition!.start_date)}</Text>
                      </View>
                      
                      <View style={[styles.planItem, { flex: 1 }]}>
                        <Text style={styles.planItemLabel}>End Date</Text>
                        <Text style={styles.planItemValue}>{formatDate(client.plans.nutrition!.end_date)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditPlan(client.plans.nutrition!.plan_id, 'nutrition')}
                  >
                    <LinearGradient
                      colors={['#6C63FF', '#8000FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.editButtonGradient}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.editButtonText}>Edit Nutrition Plan</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </MotiView>
              )}
            </View>
            
            <View style={styles.bottomSpacing} />
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#6C63FF" />
            <Text style={styles.errorText}>Client not found</Text>
            <TouchableOpacity 
              style={styles.backButtonLarge}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const { width } = Dimensions.get('window');

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  clientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  clientEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  infoItem: {
    width: '50%',
    padding: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  plansContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    marginTop: 10,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.1)',
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  planProgressContainer: {
    marginBottom: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    fontWeight: '500',
  },
  planDetails: {
    marginBottom: 25,
  },
  planItem: {
    marginBottom: 20,
  },
  planItemRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  planItemLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  planItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginTop: 5,
  },
  descriptionTruncated: {
    lineHeight: 24,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
    marginRight: 5,
  },
  editButton: {
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 30,
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
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  backButtonLarge: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
