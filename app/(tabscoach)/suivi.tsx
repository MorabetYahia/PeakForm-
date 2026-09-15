import { View, Text, StyleSheet, Platform, ScrollView, Image, TouchableOpacity, ViewStyle, ImageStyle, TextStyle, RefreshControl, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { useEffect, useState, useCallback, Fragment } from 'react';
import supabase from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type Styles = {
  container: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  statusBarSpacer: ViewStyle;
  dashboardHeader: ViewStyle;
  headerTop: ViewStyle;
  welcomeText: TextStyle;
  dateText: TextStyle;
  profileButton: ViewStyle;
  statsRow: ViewStyle;
  statBox: ViewStyle;
  statIconContainer: ViewStyle;
  statInfo: ViewStyle;
  statNumber: TextStyle;
  statLabel: TextStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitleContainer: ViewStyle;
  sectionTitle: TextStyle;
  viewAllButton: ViewStyle;
  viewAllText: TextStyle;
  clientsScrollContainer: ViewStyle;
  clientCard: ViewStyle;
  clientCardContent: ViewStyle;
  clientImageContainer: ViewStyle;
  clientImage: ImageStyle;
  clientInfo: ViewStyle;
  clientName: TextStyle;
  objectiveTag: ViewStyle;
  objectiveText: TextStyle;
  chatButton: ViewStyle;
  chatList: ViewStyle;
  chatCard: ViewStyle;
  chatCardContent: ViewStyle;
  chatClientInfo: ViewStyle;
  chatImageContainer: ViewStyle;
  chatClientImage: ImageStyle;
  chatOnlineIndicator: ViewStyle;
  chatInfo: ViewStyle;
  chatClientName: TextStyle;
  chatPreview: TextStyle;
  emptyMessage: TextStyle;
  emptyStateContainer: ViewStyle;
  emptyStateText: TextStyle;
  emptyStateSubtext: TextStyle;
  modalContainer: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  closeButton: ViewStyle;
  clientDetailsContainer: ViewStyle;
  clientProfileSection: ViewStyle;
  clientProfileImage: ImageStyle;
  clientEmail: TextStyle;
  clientInfoSection: ViewStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  planSection: ViewStyle;
  planTitle: TextStyle;
  planDetails: ViewStyle;
  planItem: ViewStyle;
  planItemLabel: TextStyle;
  planItemValue: TextStyle;
  actionButtons: ViewStyle;
  editButton: ViewStyle;
  editButtonText: TextStyle;
  loadingContainer: ViewStyle;
  headerSpacing: ViewStyle;
  subText: TextStyle;
  messageTime: TextStyle;
  chatHeader: ViewStyle;
  lastMessageText: TextStyle;
  noMessageText: TextStyle;
  clientLastMessage: TextStyle;
  onlineIndicator: ViewStyle;
};

// Define the NewClient interface
interface NewClient {
  client_id: string;
  user_id: string;
  full_name: string;
  profile_image: string;
  objective: string;
  email?: string;
  planTypes?: string;
  last_message?: string;
  last_message_time?: string;
}

// Define the ClientDetails interface
interface ClientDetails {
  client_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image: string;
  objective: string;
  plan: {
    plan_id: string;
    name: string;
    description: string;
    duration: string;
    price: number;
    start_date: string;
    end_date: string;
    status: string;
  };
}

// Add new interface for chat clients
interface ChatClient {
  client_id: string;
  user_id: string;
  full_name: string;
  profile_image: string;
  last_message?: string;
  last_message_time?: string;
  is_online?: boolean;
}

// Define the exact type that Supabase returns
type SupabaseChatMessage = {
  message_text: string;
  sent_at: string;
  sender_id: string;
  chat_session: {
    client_plan: {
      client_id: string;
    }[];
  }[];
};

export default function Tab() {
  const [refreshing, setRefreshing] = useState(false);
  const [newClients, setNewClients] = useState<NewClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatClients, setChatClients] = useState<ChatClient[]>([]);
  const router = useRouter();

  const fetchNewClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coachData } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (!coachData) return;

      // Get all plans created by this coach
      const { data: plansData } = await supabase
        .from('plan')
        .select('plan_id')
        .eq('coach_id', coachData.coach_id);

      if (!plansData || plansData.length === 0) return;

      const planIds = plansData.map(plan => plan.plan_id);

      // Get clients who have purchased these plans without chat messages
      const { data: clientPlansData } = await supabase
        .from('client_plan')
        .select(`
          client_id,
          client:client_id (
            user_id,
            user:user_id (
              Full_name,
              profile_image,
              email
            )
          ),
          plan:plan_id (
            objective
          )
        `)
        .in('plan_id', planIds)
        .order('purchase_date', { ascending: false });

      if (clientPlansData) {
        // Create a Map to track unique clients and their objectives
        const uniqueClients = new Map();
        
        clientPlansData.forEach(cp => {
          const clientData = cp.client as any;
          const userData = clientData.user as any;
          const planData = cp.plan as any;
          
          if (!uniqueClients.has(cp.client_id)) {
            uniqueClients.set(cp.client_id, {
              client_id: cp.client_id,
              user_id: clientData.user_id,
              full_name: userData.Full_name,
              profile_image: userData.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
              objectives: new Set([planData.objective || 'No objective set']),
              last_message: '',
              last_message_time: null
            });
          } else {
            // Add the objective to the existing client's objectives set
            const client = uniqueClients.get(cp.client_id);
            client.objectives.add(planData.objective || 'No objective set');
          }
        });
        
        // Convert the Map to an array and format the objectives
        const formattedClients = Array.from(uniqueClients.values()).map(client => ({
          ...client,
          objective: Array.from(client.objectives).join(', ')
        }));
        
        setNewClients(formattedClients);
      }
    } catch (error) {
      console.error('Error fetching new clients:', error);
    }
  };

  const fetchChatClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coachData } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      if (!coachData) return;

      // First get all plans created by this coach
      const { data: plansData } = await supabase
        .from('plan')
        .select('plan_id')
        .eq('coach_id', coachData.coach_id);

      if (!plansData || plansData.length === 0) return;

      const planIds = plansData.map(plan => plan.plan_id);

      // Get all clients who have purchased these plans
      const { data: clientPlansData } = await supabase
        .from('client_plan')
        .select(`
          client_id,
          client:client_id (
            user_id,
            user:user_id (
              Full_name,
              profile_image
            )
          )
        `)
        .in('plan_id', planIds);

      if (!clientPlansData) return;

      // Create a map to store client data
      const clientMap = new Map();
      
      // First, initialize the client map with basic client info
      clientPlansData.forEach(cp => {
        const clientData = cp.client as any;
        const userData = clientData.user as any;
        
        if (!clientMap.has(cp.client_id)) {
          clientMap.set(cp.client_id, {
            client_id: cp.client_id,
            user_id: clientData.user_id,
            full_name: userData.Full_name,
            profile_image: userData.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
            last_message: '',
            last_message_time: null,
            is_online: Math.random() > 0.5 // Temporary random online status
          });
        }
      });

      // Now fetch all chat messages for these clients
      const { data: chatMessages } = await supabase
        .from('chat_message')
        .select(`
          message_text,
          sent_at,
          sender_id,
          chat_session:chat_session_id (
            client_plan:client_plan_id (
              client_id
            )
          )
        `)
        .in('chat_session.client_plan.client_id', Array.from(clientMap.keys()))
        .order('sent_at', { ascending: false });

      // Process chat messages and update client map
      if (chatMessages) {
        (chatMessages as unknown as SupabaseChatMessage[]).forEach(message => {
          const clientPlan = message.chat_session?.[0]?.client_plan?.[0];
          if (clientPlan && clientMap.has(clientPlan.client_id)) {
            const client = clientMap.get(clientPlan.client_id);
            // Only update if this message is more recent than the current last message
            if (!client.last_message_time || new Date(message.sent_at) > new Date(client.last_message_time)) {
              client.last_message = message.message_text;
              client.last_message_time = message.sent_at;
            }
          }
        });
      }

      // Convert the map to an array and sort by last message time
      const chatClients = Array.from(clientMap.values())
        .sort((a, b) => {
          if (!a.last_message_time) return 1;
          if (!b.last_message_time) return -1;
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        });

      setChatClients(chatClients);
    } catch (error) {
      console.error('Error fetching chat clients:', error);
    }
  };

  useEffect(() => {
    fetchNewClients();
    fetchChatClients();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchNewClients(), fetchChatClients()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  // Function to fetch detailed client information
  const fetchClientDetails = async (clientId: string) => {
    setLoading(true);
    try {
      // Get client details
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select(`
          client_id,
          user_id,
          user:user_id (
            Full_name,
            email,
            profile_image
          )
        `)
        .eq('client_id', clientId)
        .single();

      if (clientError || !clientData) {
        console.error('Error fetching client:', clientError);
        setLoading(false);
        return;
      }

      // Get client's plan
      const { data: planData, error: planError } = await supabase
        .from('client_plan')
        .select(`
          plan_id,
          purchase_date,
          plan:plan_id (
            plan_id,
            name,
            description,
            duration,
            price,
            objective
          )
        `)
        .eq('client_id', clientId)
        .order('purchase_date', { ascending: false })
        .limit(1)
        .single();

      const userData = clientData.user as any;
      
      // Create client details object
      const clientDetails: ClientDetails = {
        client_id: clientData.client_id,
        user_id: clientData.user_id,
        full_name: userData.Full_name,
        email: userData.email || 'N/A',
        phone: 'N/A', // Add phone if available in your database
        profile_image: userData.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
        objective: 'Not specified',
        plan: {
          plan_id: '',
          name: 'No plan assigned',
          description: 'This client does not have an active plan.',
          duration: '0',
          price: 0,
          start_date: 'N/A',
          end_date: 'N/A',
          status: 'Inactive'
        }
      };

      // If plan data exists, update the client details
      if (planData && !planError) {
        const plan = planData.plan as any;
        
        // Format dates
        const startDate = new Date(planData.purchase_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(plan.duration));

        clientDetails.objective = plan.objective || 'Not specified';
        clientDetails.plan = {
          plan_id: plan.plan_id,
          name: plan.name || 'Unnamed Plan',
          description: plan.description || 'No description available',
          duration: plan.duration || '0',
          price: plan.price || 0,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'Active'
        };
      }

      setSelectedClient(clientDetails);
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle edit plan
  const handleEditPlan = () => {
    if (selectedClient) {
      router.push({
        pathname: '/edit-plan',
        params: { 
          planId: selectedClient.plan.plan_id,
          clientId: selectedClient.client_id
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.statusBarSpacer} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6C63FF']}
            tintColor="#6C63FF"
          />
        }
      >
        {/* Dashboard Header */}
        <LinearGradient
          colors={['#6C63FF', '#8000FF']}
          style={styles.dashboardHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back, Coach</Text>
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={20} color="#6C63FF" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{newClients.length}</Text>
                <Text style={styles.statLabel}>Active Clients</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="chatbubbles" size={20} color="#6C63FF" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{chatClients.length}</Text>
                <Text style={styles.statLabel}>Active Chats</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Recent Clients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time" size={24} color="#6C63FF" />
              <Text style={styles.sectionTitle}>Recent Clients</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6C63FF" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clientsScrollContainer}
          >
            {newClients.length > 0 ? (
              newClients.slice(0, 5).map((client, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.clientCard}
                  onPress={() => router.push({
                    pathname: '/plan/clickableclient',
                    params: { clientId: client.client_id }
                  })}
                >
                  <View style={styles.clientCardContent}>
                    <View style={styles.clientInfo}>
                      <View style={styles.clientImageContainer}>
                        <Image 
                          source={{ uri: client.profile_image }}
                          style={styles.clientImage}
                        />
                        <View style={styles.onlineIndicator} />
                      </View>
                      <Text style={styles.clientName} numberOfLines={1}>{client.full_name}</Text>
                      <View style={styles.objectiveTag}>
                        <Text style={styles.objectiveText} numberOfLines={1}>{client.objective}</Text>
                      </View>
                      {client.last_message && (
                        <Text style={styles.clientLastMessage} numberOfLines={1}>
                          {client.last_message}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.chatButton}
                      onPress={() => router.push({
                        pathname: '/plan/Chatcoach',
                        params: { clientId: client.client_id }
                      })}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#6C63FF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="people-outline" size={32} color="#ccc" />
                <Text style={styles.emptyStateText}>No clients yet</Text>
                <Text style={styles.emptyStateSubtext}>Your clients will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Active Chats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="chatbubbles" size={24} color="#6C63FF" />
              <Text style={styles.sectionTitle}>Active Chats</Text>
            </View>
          </View>

          <View style={styles.chatList}>
            {chatClients.length > 0 ? (
              chatClients.map((client, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.chatCard}
                  onPress={() => router.push({
                    pathname: '/plan/Chatcoach',
                    params: { clientId: client.client_id }
                  })}
                >
                  <View style={styles.chatCardContent}>
                    <View style={styles.chatClientInfo}>
                      <View style={styles.chatImageContainer}>
                        <Image 
                          source={{ uri: client.profile_image }}
                          style={styles.chatClientImage}
                        />
                        {client.is_online && <View style={styles.chatOnlineIndicator} />}
                      </View>
                      <View style={styles.chatInfo}>
                        <View style={styles.chatHeader}>
                          <Text style={styles.chatClientName} numberOfLines={1}>{client.full_name}</Text>
                          {client.last_message_time && (
                            <Text style={styles.messageTime}>
                              {new Date(client.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.chatPreview} numberOfLines={1}>
                          {client.last_message}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.chatButton}
                      onPress={() => router.push({
                        pathname: '/plan/Chatcoach',
                        params: { clientId: client.client_id }
                      })}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#6C63FF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
                <Text style={styles.emptyStateText}>No active chats</Text>
                <Text style={styles.emptyStateSubtext}>Start a conversation with your clients</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Client Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.subText}>Loading client details...</Text>
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Client Details</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {selectedClient && (
                <Fragment>
                  {/* Client Profile Section */}
                  <View style={styles.clientDetailsContainer}>
                    <View style={styles.clientProfileSection}>
                      <Image 
                        source={{ uri: selectedClient.profile_image }}
                        style={styles.clientProfileImage}
                      />
                      <Text style={styles.clientName}>{selectedClient.full_name}</Text>
                      <Text style={styles.clientEmail}>{selectedClient.email}</Text>
                    </View>

                    {/* Client Info Section */}
                    <View style={styles.clientInfoSection}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Client ID:</Text>
                        <Text style={styles.infoValue}>{selectedClient.client_id}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Objective:</Text>
                        <Text style={styles.infoValue}>{selectedClient.objective}</Text>
                      </View>
                    </View>

                    {/* Plan Section */}
                    <View style={styles.planSection}>
                      <Text style={styles.planTitle}>Current Plan</Text>
                      <View style={styles.planDetails}>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Plan Name:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.name}</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Description:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.description}</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Duration:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.duration} months</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Price:</Text>
                          <Text style={styles.planItemValue}>${selectedClient.plan.price}</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Start Date:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.start_date}</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>End Date:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.end_date}</Text>
                        </View>
                        <View style={styles.planItem}>
                          <Text style={styles.planItemLabel}>Status:</Text>
                          <Text style={styles.planItemValue}>{selectedClient.plan.status}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={handleEditPlan}
                      >
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.editButtonText}>Edit Plan</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Fragment>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    backgroundColor: '#6C63FF',
  },
  dashboardHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
  },
  clientsScrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  clientCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.1)',
    marginRight: 12,
  },
  clientCardContent: {
    padding: 12,
  },
  clientImageContainer: {
    position: 'relative',
    marginBottom: 8,
    alignItems: 'center',
  },
  clientImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: '50%',
    marginRight: -16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clientInfo: {
    alignItems: 'center',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  objectiveTag: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    width: '100%',
  },
  objectiveText: {
    fontSize: 12,
    color: '#6C63FF',
    textAlign: 'center',
  },
  chatButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    gap: 12,
  },
  chatCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.1)',
    marginBottom: 12,
  },
  chatCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatClientImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
  },
  chatClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#333',
  },
  emptyMessage: {
    color: '#999',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  clientDetailsContainer: {
    flex: 1,
  },
  clientProfileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clientProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  clientEmail: {
    fontSize: 16,
    color: '#666',
  },
  clientInfoSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
  planSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  planDetails: {
    gap: 10,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planItemValue: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  headerSpacing: {
    height: 20,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#333',
  },
  noMessageText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  clientLastMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});