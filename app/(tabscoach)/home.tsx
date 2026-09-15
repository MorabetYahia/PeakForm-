import { View, Text, StyleSheet, Platform, Pressable, ScrollView, Image, TouchableOpacity, ViewStyle, ImageStyle, TextStyle, RefreshControl, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type Styles = {
  container: ViewStyle;
  fixedHeader: ViewStyle;
  header: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  headerTop: ViewStyle;
  profileSection: ViewStyle;
  profileIcon: ViewStyle;
  profileImage: ImageStyle;
  onlineIndicator: ViewStyle;
  welcomeSection: ViewStyle;
  welcomeText: TextStyle;
  userName: TextStyle;
  statsPreview: ViewStyle;
  statItem: ViewStyle;
  statText: TextStyle;
  dateText: TextStyle;
  headerActions: ViewStyle;
  actionButton: ViewStyle;
  notificationBadge: ViewStyle;
  dateSection: ViewStyle;
  subText: TextStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  seeAll: TextStyle;
  overviewGrid: ViewStyle;
  overviewCard: ViewStyle;
  overviewIcon: ViewStyle;
  overviewContent: ViewStyle;
  overviewNumber: TextStyle;
  overviewLabel: TextStyle;
  quickActions: ViewStyle;
  actionCard: ViewStyle;
  actionGradient: ViewStyle;
  actionText: TextStyle;
  newClientsGrid: ViewStyle;
  newClientCard: ViewStyle;
  newClientContent: ViewStyle;
  newClientImageContainer: ViewStyle;
  newClientImage: ImageStyle;
  newClientStatus: ViewStyle;
  newClientInfo: ViewStyle;
  newClientName: TextStyle;
  newClientObjectiveContainer: ViewStyle;
  newClientObjective: TextStyle;
  newClientStats: ViewStyle;
  newClientStat: ViewStyle;
  newClientStatText: TextStyle;
  newClientGradient: ViewStyle;
  newClientHeader: ViewStyle;
  overviewGradient: ViewStyle;
  overviewTrend: ViewStyle;
  refreshIndicator: ViewStyle;
  refreshText: TextStyle;
};

// Define the NewClient interface
interface NewClient {
  client_id: string;
  user_id: string;
  full_name: string;
  profile_image: string;
  objective: string;
}

interface OverviewData {
  activeClients: number;
  totalEarnings: number;
  averageRating: number;
}

export default function Tab() {
  const [fullName, setFullName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newClients, setNewClients] = useState<NewClient[]>([]);
  const [overviewData, setOverviewData] = useState<OverviewData>({
    activeClients: 2,
    totalEarnings: 120,
    averageRating: 4.2
  });
  const router = useRouter();
  
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refresh user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('user')
          .select('Full_name, profile_image')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setFullName(profileData.Full_name);
          if (profileData.profile_image) {
            setProfileImage(profileData.profile_image);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function getUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch user's profile data including full name
          const { data: profileData, error } = await supabase
            .from('user')
            .select('Full_name, profile_image')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }

          if (profileData) {
            setFullName(profileData.Full_name);
            if (profileData.profile_image) {
              setProfileImage(profileData.profile_image);
            }
          }

          // Subscribe to real-time updates for the user's profile
          const subscription = supabase
            .channel('user-profile-changes')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'user',
                filter: `user_id=eq.${user.id}`
              },
              (payload: { new: { Full_name: string, profile_image: string } }) => {
                if (payload.new.Full_name) {
                  setFullName(payload.new.Full_name);
                }
                if (payload.new.profile_image) {
                  setProfileImage(payload.new.profile_image);
                }
              }
            )
            .subscribe();

          // Subscribe to broadcast events for immediate updates
          const broadcastSubscription = supabase
            .channel('profile-update')
            .on('presence', { event: 'sync' }, (payload: { payload?: { Full_name: string, profile_image: string } }) => {
              if (payload.payload?.Full_name) {
                setFullName(payload.payload.Full_name);
              }
              if (payload.payload?.profile_image) {
                setProfileImage(payload.payload.profile_image);
              }
            })
            .subscribe();

          // Cleanup subscriptions on unmount
          return () => {
            subscription.unsubscribe();
            broadcastSubscription.unsubscribe();
          };
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    getUserProfile();
  }, []);

  // Fetch new clients who have purchased plans
  useEffect(() => {
    async function fetchNewClients() {
      try {
        // Get the current coach's ID
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

        // Get clients who have purchased these plans
        const { data: clientPlansData } = await supabase
          .from('client_plan')
          .select(`
            client_id,
            plan_id,
            client:client_id (
              user_id,
              user:user_id (
                Full_name,
                profile_image
              )
            ),
            plan:plan_id (
              objective
            )
          `)
          .in('plan_id', planIds)
          .order('purchase_date', { ascending: false })
          .limit(4);

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
                objectives: new Set([planData.objective || 'No objective set'])
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
    }

    fetchNewClients();
  }, []);

  // Fetch overview data
  useEffect(() => {
    async function fetchOverviewData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get coach data including revenue
        const { data: coachData } = await supabase
          .from('coach')
          .select('coach_id, revenue')
          .eq('user_id', user.id)
          .single();

        if (!coachData) return;

        // Get unique active clients count
        const { data: clientPlansData } = await supabase
          .from('client_plan')
          .select('client_id')
          .eq('coach_id', coachData.coach_id)
          .gte('expiration_date', new Date().toISOString());

        // Get unique client IDs (remove duplicates)
        const uniqueClientIds = new Set(clientPlansData?.map(cp => cp.client_id) || []);
        const activeClientsCount = uniqueClientIds.size;

        // Get average rating from plans
        const { data: plansData } = await supabase
          .from('plan')
          .select('rating')
          .eq('coach_id', coachData.coach_id);

        if (plansData) {
          // Calculate average rating
          const validRatings = plansData
            .map(plan => plan.rating)
            .filter(rating => rating !== null && rating !== undefined);
          
          const averageRating = validRatings.length > 0 
            ? validRatings.reduce((sum, rating) => sum + Number(rating), 0) / validRatings.length
            : 0;

          setOverviewData({
            activeClients: activeClientsCount,
            totalEarnings: coachData.revenue || 0,
            averageRating: averageRating
          });
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      }
    }

    fetchOverviewData();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <LinearGradient
          colors={['#8000ff', '#8000ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.profileSection}>
              <TouchableOpacity 
                style={styles.profileIcon}
                onPress={() => router.push('/profile')}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profileImage, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                    <Ionicons name="person-outline" size={24} color="#fff" />
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </TouchableOpacity>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>Welcome back, Coach</Text>
                <Text style={styles.userName}>{fullName || 'Loading...'}</Text>
                <View style={styles.statsPreview}>
                  <View style={styles.statItem}>
                    <Ionicons name="trending-up" size={14} color="#fff" />
                    <Text style={styles.statText}>Active</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={14} color="#fff" />
                    <Text style={styles.statText}>4.2</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/suivi')}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/more')}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.subText}>Track your fitness journey today</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'ios' ? 180 : 160 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#8000FF']}
            tintColor="#8000FF"
            progressBackgroundColor="#ffffff"
            progressViewOffset={Platform.OS === 'ios' ? 180 : 160}
          />
        }
      >
        {isRefreshing && (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator size="small" color="#8000FF" />
            <Text style={styles.refreshText}>Refreshing data...</Text>
          </View>
        )}

        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={styles.subText}>Track your fitness journey today</Text>
        </View>

        {/* Today's Overview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="people" size={24} color="#6C63FF" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewNumber}>2</Text>
                <Text style={styles.overviewLabel}>Active Clients</Text>
              </View>
            </View>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="star" size={24} color="#FF9800" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewNumber}>4.2</Text>
                <Text style={styles.overviewLabel}>Avg Rating</Text>
              </View>
            </View>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="cash" size={24} color="#4CAF50" />
              </View>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewNumber}>$120</Text>
                <Text style={styles.overviewLabel}>Total Earnings</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/suivi')}
            >
              <LinearGradient
                colors={['#6C63FF', '#8000FF']}
                style={styles.actionGradient}
              >
                <Ionicons name="analytics" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionText}>Tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/suivi')}
            >
              <LinearGradient
                colors={['#FF9800', '#FF5722']}
                style={styles.actionGradient}
              >
                <Ionicons name="people" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionText}>Client</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/plans')}
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.actionGradient}
              >
                <Ionicons name="document-text" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionText}>Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/plans')}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.actionGradient}
              >
                <Ionicons name="nutrition" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionText}>Nutrition</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New Clients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Clients</Text>
            <TouchableOpacity onPress={() => router.push('/clients')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.newClientsGrid}>
            {newClients.length > 0 ? (
              newClients.map((client, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.newClientCard}
                  onPress={() => router.push({
                    pathname: '/suivi',
                    params: { clientId: client.client_id }
                  })}
                >
                  <View style={styles.newClientContent}>
                    <View style={styles.newClientImageContainer}>
                      <Image 
                        source={{ uri: client.profile_image }}
                        style={styles.newClientImage}
                      />
                      <View style={styles.newClientStatus} />
                    </View>
                    <View style={styles.newClientInfo}>
                      <Text style={styles.newClientName}>{client.full_name}</Text>
                      <View style={styles.newClientObjectiveContainer}>
                        <Ionicons name="fitness" size={14} color="#6C63FF" />
                        <Text style={styles.newClientObjective}>{client.objective}</Text>
                      </View>
                      <View style={styles.newClientStats}>
                        <View style={styles.newClientStat}>
                          <Ionicons name="calendar" size={12} color="#666" />
                          <Text style={styles.newClientStatText}>Joined today</Text>
                        </View>
                        <View style={styles.newClientStat}>
                          <Ionicons name="star" size={12} color="#FFC107" />
                          <Text style={styles.newClientStatText}>New</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.subText}>No new clients yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 180 : 160,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#8000ff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  welcomeSection: {
    flexDirection: 'column',
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  dateSection: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    borderWidth: 1.5,
    borderColor: '#8000ff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 5,
  },
  actionCard: {
    alignItems: 'center',
    width: '23%',
  },
  actionGradient: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  newClientsGrid: {
    marginTop: 15,
    marginBottom: 10,
  },
  newClientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  newClientContent: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
  },
  newClientImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  newClientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  newClientStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  newClientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  newClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  newClientObjectiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  newClientObjective: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  newClientStats: {
    flexDirection: 'row',
    gap: 8,
  },
  newClientStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newClientStatText: {
    fontSize: 11,
    color: '#666',
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
    marginBottom: 5,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  overviewContent: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  newClientGradient: {
    // Empty style since it's not used
  },
  newClientHeader: {
    // Empty style since it's not used
  },
  overviewGradient: {
    // Empty style since it's not used
  },
  overviewTrend: {
    // Empty style since it's not used
  },
  refreshIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 180 : 160,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
  },
  refreshText: {
    color: '#8000FF',
    fontSize: 14,
    fontWeight: '500',
  },
});