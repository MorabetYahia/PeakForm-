import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from './lib/supabase';

interface ClientDetails {
  client_id: string;
  user_id: string;
  full_name: string;
  email: string;
  birthdate: string;
  gender: string;
  phone_number: string;
  profile_image: string;
  plan_id: string;
  plan_title: string;
  plan_objective: string;
  plan_type: string;
  purchase_date: string;
  expiration_date: string;
}

export default function ClientDetails() {
  const { clientId } = useLocalSearchParams();
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClientDetails() {
      try {
        setIsLoading(true);
        
        // Fetch client details with user information and plan details
        const { data, error } = await supabase
          .from('client_plan')
          .select(`
            client_id,
            plan_id,
            purchase_date,
            expiration_date,
            client:client_id (
              user_id,
              user:user_id (
                Full_name,
                email,
                birthdate,
                gender,
                phone_number,
                profile_image
              )
            ),
            plan:plan_id (
              title,
              objective,
              type
            )
          `)
          .eq('client_id', clientId)
          .single();

        if (error) {
          console.error('Error fetching client details:', error);
          return;
        }

        if (data) {
          // Format the data for our interface
          const clientData = data.client as any;
          const userData = clientData.user as any;
          const planData = data.plan as any;
          
          setClient({
            client_id: data.client_id,
            user_id: clientData.user_id,
            full_name: userData.Full_name,
            email: userData.email,
            birthdate: userData.birthdate,
            gender: userData.gender,
            phone_number: userData.phone_number || 'Not provided',
            profile_image: userData.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg',
            plan_id: data.plan_id,
            plan_title: planData.title,
            plan_objective: planData.objective,
            plan_type: planData.type,
            purchase_date: data.purchase_date,
            expiration_date: data.expiration_date
          });
        }
      } catch (error) {
        console.error('Error in fetchClientDetails:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
        <Text style={styles.errorText}>Client not found</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
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
        <Text style={styles.headerTitle}>Client Details</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: client.profile_image }}
            style={styles.profileImage}
          />
          <Text style={styles.clientName}>{client.full_name}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active Client</Text>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{client.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{client.phone_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{client.gender}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Birthdate</Text>
              <Text style={styles.infoValue}>{formatDate(client.birthdate)}</Text>
            </View>
          </View>
        </View>

        {/* Physical Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Stats</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Height</Text>
              <Text style={styles.infoValue}>Not recorded</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>Not recorded</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BMI</Text>
              <Text style={styles.infoValue}>Not calculated</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addStatsButton}>
            <Ionicons name="add-circle-outline" size={20} color="#6C63FF" />
            <Text style={styles.addStatsText}>Add Physical Stats</Text>
          </TouchableOpacity>
        </View>

        {/* Plan Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue}>{client.plan_title}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{client.plan_type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Objective</Text>
              <Text style={styles.infoValue}>{client.plan_objective}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Purchase Date</Text>
              <Text style={styles.infoValue}>{formatDate(client.purchase_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expiration Date</Text>
              <Text style={styles.infoValue}>{formatDate(client.expiration_date)}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewPlanButton}
            onPress={() => router.push({
              pathname: '/plan/Editplan',
              params: { 
                plan_id: client.plan_id,
                clientName: client.full_name
              }
            })}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.viewPlanButtonText}>Edit Client Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#6C63FF" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="calendar-outline" size={24} color="#6C63FF" />
            <Text style={styles.actionButtonText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text-outline" size={24} color="#6C63FF" />
            <Text style={styles.actionButtonText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '500',
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 12,
  },
  addStatsText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 16,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    width: '30%',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
    marginTop: 8,
  },
  viewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
  },
  viewPlanButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
});