import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Platform, Alert, RefreshControl, Modal, Dimensions, Animated } from 'react-native';
import { router } from 'expo-router';
import supabase from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export default function Tab() {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    profileImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0.3));
  const [statAnim] = useState(new Animated.Value(0));
  const [userStats, setUserStats] = useState({
    orders: 0,
    visits: 0,
    wishlist: 0
  });

  // Start the fade animation for skeleton loading effect
  useEffect(() => {
    // Create a loop animation for the skeleton loading effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  // Animate stats when loaded
  useEffect(() => {
    if (!loading) {
      Animated.spring(statAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, statAnim]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await getUserProfile();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  async function getUserProfile() {
    try {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Set email from auth user
        const email = user.email || '';
        
        // Get full name from user metadata
        const fullName = user.user_metadata?.full_name || '';
        
        // Get profile image from user table
        const { data: profileData, error } = await supabase
          .from('user')
          .select('profile_image, Full_name, birthdate, gender, phone_number')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // Get user activity stats (mocked for now - replace with actual queries)
        // For a real implementation, fetch these from your database
        const mockStats = {
          orders: Math.floor(Math.random() * 15),
          visits: Math.floor(Math.random() * 50) + 20,
          wishlist: Math.floor(Math.random() * 10)
        };
        setUserStats(mockStats);

        setUserData({
          username: profileData?.Full_name || fullName,
          email: email,
          profileImage: profileData?.profile_image || ''
        });

        // Subscribe to profile updates
        const profileUpdateSubscription = supabase
          .channel(`profile-update-${user.id}`)  // Make channel unique per user
          .on('broadcast', { event: 'profile-changed' }, (payload) => {
            console.log('Profile broadcast received in more:', payload);
            if (payload.payload) {
              setUserData(prev => ({
                ...prev,
                username: payload.payload.fullName || prev.username
              }));
            }
          })
          .on('broadcast', { event: 'profile-image-changed' }, (payload) => {
            console.log('Image broadcast received in more:', payload);
            if (payload.payload?.profile_image) {
              setUserData(prev => ({
                ...prev,
                profileImage: payload.payload.profile_image
              }));
            }
          })
          .subscribe();

        // Subscribe to database changes
        const dbSubscription = supabase
          .channel('db-changes')
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'user',
              filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
              console.log('DB change received in more:', payload);
              const newData = payload.new;
              setUserData(prev => ({
                ...prev,
                username: newData.Full_name || prev.username,
                profileImage: newData.profile_image || prev.profileImage
              }));
            }
          )
          .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
          profileUpdateSubscription.unsubscribe();
          dbSubscription.unsubscribe();
        };
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getUserProfile();
  }, []);

  const handleImageUpload = async () => {
    try {
      // Request permission to access the camera roll
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Auth error:', authError);
          Alert.alert('Error', 'Authentication error. Please try logging in again.');
          return;
        }
        if (!user) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        // Get the file extension from the URI
        const fileExt = result.assets[0].uri.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Convert base64 to blob
        const base64Data = result.assets[0].base64;
        if (!base64Data) {
          throw new Error('Failed to get image data');
        }

        // Upload image to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64Data), {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get a signed URL with 1 year expiration
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(filePath, 31536000);

        if (!data?.signedUrl) {
          throw new Error('Failed to generate signed URL');
        }

        const signedUrl = data.signedUrl;

        // Update user profile image in database
        const { error: updateError } = await supabase
          .from('user')
          .update({ profile_image: signedUrl })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }

        // Update local state
        setUserData(prev => ({
          ...prev,
          profileImage: signedUrl
        }));

        // Force a refresh of the profile image in other components
        await supabase
          .channel('profile-image-update')
          .send({
            type: 'broadcast',
            event: 'profile-image-changed',
            payload: { profile_image: signedUrl }
          });

        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Error',
        'Failed to upload profile picture. Please check your internet connection and try again.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out the user from Supabase
      await supabase.auth.signOut();
      // Redirect to login screen
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar translucent backgroundColor="#000000" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#b300ff']}
            tintColor="#b300ff"
          />
        }
      >
        <View style={styles.container}>
          {/* Profile Section */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {loading ? (
                // Skeleton loading for profile image
                <Animated.View 
                  style={[
                    styles.profileImageContainer, 
                    styles.skeletonAnimation,
                    { opacity: fadeAnim }
                  ]}
                />
              ) : (
                <TouchableOpacity 
                  style={styles.profileImageContainer}
                  onPress={() => userData.profileImage ? setIsImageModalVisible(true) : handleImageUpload()}
                  activeOpacity={0.8}
                >
                  {userData.profileImage ? (
                    <Image 
                      source={{ 
                        uri: userData.profileImage,
                        cache: 'reload'
                      }}
                      style={styles.profileImage}
                      onError={(e) => {
                        console.error('Image loading error:', e.nativeEvent.error);
                      }}
                    />
                  ) : (
                    <View style={[styles.profileImage, styles.placeholderImage]}>
                      <Ionicons name="person-outline" size={50} color="#b300ff" />
                    </View>
                  )}
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.profileInfo}>
                {loading ? (
                  // Skeleton loading for text
                  <>
                    <Animated.View 
                      style={[
                        styles.skeletonText, 
                        styles.skeletonAnimation,
                        { opacity: fadeAnim, height: 24, width: '80%', marginBottom: 8 }
                      ]} 
                    />
                    <Animated.View 
                      style={[
                        styles.skeletonText, 
                        styles.skeletonAnimation,
                        { opacity: fadeAnim, height: 16, width: '60%' }
                      ]} 
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
                      {userData.username || 'User'}
                    </Text>
                    <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">
                      {userData.email}
                    </Text>
                    <View style={styles.userStatusBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={styles.userStatusText}>Active</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* User Statistics */}
            {!loading && (
              <Animated.View 
                style={[
                  styles.statsContainer,
                  {
                    opacity: statAnim,
                    transform: [
                      {
                        scale: statAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1]
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{userStats.orders}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{userStats.visits}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{userStats.wishlist}</Text>
                  <Text style={styles.statLabel}>Wishlist</Text>
                </View>
              </Animated.View>
            )}

            {loading ? (
              // Skeleton for button
              <Animated.View 
                style={[
                  styles.editProfileButton, 
                  styles.skeletonAnimation,
                  { opacity: fadeAnim, backgroundColor: '#e1e1e1' }
                ]} 
              />
            ) : (
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={() => router.push('/settings/edit')}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#fff" style={styles.editIcon} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}

            {/* Full Screen Image Modal */}
            <Modal
              visible={isImageModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsImageModalVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalContainer}
                activeOpacity={1}
                onPress={() => setIsImageModalVisible(false)}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setIsImageModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalChangeButton}
                    onPress={() => {
                      setIsImageModalVisible(false);
                      setTimeout(() => handleImageUpload(), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={24} color="white" />
                  </TouchableOpacity>
                </View>
                
                <Image
                  source={{ uri: userData.profileImage }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Learn My Cart Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Profil</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Cart/cart')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="cart-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>My cart</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Learn')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="school-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Learn</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/FAQ')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="help-circle-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>FAQ</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Guide')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="book-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Guide</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Account Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Security')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Security</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Notifications')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="notifications-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Payment')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="card-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Payment Methods</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>          

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/Privacy')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="lock-closed-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Privacy</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/HelpSupport')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="help-buoy-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/Morepages/RateApp')}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="star-outline" size={24} color="#b300ff" />
                <Text style={styles.settingText}>Rate the App</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Logout Button at bottom */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Add padding for status bar
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  profileCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '90%',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#b300ff',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 5,
    backgroundColor: 'rgba(179, 0, 255, 0.7)',
    borderRadius: 15,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  userStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#b300ff',
    width: '90%',
    marginTop: 10,
  },
  editIcon: {
    marginRight: 5,
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  settingsSection: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#b300ff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  modalCloseButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  modalChangeButton: {
    padding: 10,
    backgroundColor: 'rgba(179, 0, 255, 0.7)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  skeletonAnimation: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  skeletonText: {
    borderRadius: 4,
    backgroundColor: '#e1e1e1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginVertical: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b300ff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
  },
});
