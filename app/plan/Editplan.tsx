import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import supabase from '../lib/supabase';

interface Plan {
  plan_id: string;
  title: string;
  objective: string;
  type: string;
  price: number;
  description: string;
  level: string;
  plan_duration: string;
}

export default function EditPlan() {
  const params = useLocalSearchParams();
  const [formData, setFormData] = useState<Plan>({
    plan_id: '',
    title: '',
    objective: '',
    type: '',
    price: 0,
    description: '',
    level: '',
    plan_duration: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params.plan_id) {
      fetchPlanDetails();
    }
  }, [params.plan_id]);

  const fetchPlanDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('plan')
        .select('*')
        .eq('plan_id', params.plan_id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          plan_id: data.plan_id,
          title: data.title,
          objective: data.objective,
          type: data.type,
          price: data.price,
          description: data.description || '',
          level: data.level,
          plan_duration: data.plan_duration
        });
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      Alert.alert('Error', 'Failed to load plan details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!formData.title || !formData.objective || !formData.type || !formData.level || !formData.plan_duration) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const { error } = await supabase
        .from('plan')
        .update({
          title: formData.title,
          objective: formData.objective,
          type: formData.type,
          price: parseFloat(formData.price.toString()),
          description: formData.description,
          level: formData.level,
          plan_duration: formData.plan_duration
        })
        .eq('plan_id', formData.plan_id);

      if (error) throw error;

      Alert.alert('Success', 'Plan updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
      console.error('Error updating plan:', error);
      Alert.alert('Error', 'Failed to update plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8000ff" />
        <Text style={styles.loadingText}>Loading plan details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#8000ff" barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.statusBarSpace} />
      
      <View style={styles.header}>
        <Pressable 
          style={({pressed}) => [
            styles.backButton,
            pressed && styles.buttonPressed
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Plan</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan title"
                value={formData.title}
                onChangeText={(text) => handleChange('title', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Objective *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan objective"
                value={formData.objective}
                onChangeText={(text) => handleChange('objective', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan type"
                value={formData.type}
                onChangeText={(text) => handleChange('type', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Level *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan level"
                value={formData.level}
                onChangeText={(text) => handleChange('level', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Plan Duration *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan duration"
                value={formData.plan_duration}
                onChangeText={(text) => handleChange('plan_duration', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                keyboardType="numeric"
                value={formData.price.toString()}
                onChangeText={(text) => handleChange('price', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter plan description"
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable 
              style={({pressed}) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                isSaving && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#B721FF', '#8A2BE2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={styles.buttonContent}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <AntDesign name="save" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Save Changes</Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable 
              style={({pressed}) => [
                styles.cancelButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => router.back()}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#f8f9fa', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="close" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statusBarSpace: {
    height: StatusBar.currentHeight || 40,
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
    paddingBottom: 10,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 90 : 70,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  formContainer: {
    padding: 12,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  gradient: {
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    transform: [{scale: 0.98}],
    opacity: 0.95,
  },
});
