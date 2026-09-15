import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import supabase from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// @ts-ignore - This package might need to be installed
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define form validation interface
interface FormValidation {
  fullName: boolean;
  birthdate: boolean;
  phoneNumber: boolean;
  height: boolean;
  weight: boolean;
  [key: string]: boolean;
}

// Define form data interface
interface FormData {
  fullName: string;
  email: string;
  birthdate: string;
  gender: string;
  phoneNumber: string;
  profileImage: string;
  address: string;
  height: string;
  weight: string;
  [key: string]: string;
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    birthdate: '',
    gender: '',
    phoneNumber: '',
    profileImage: '',
    address: '',
    height: '',
    weight: '',
  });
  const [isValid, setIsValid] = useState<FormValidation>({
    fullName: true,
    birthdate: true,
    phoneNumber: true,
    height: true,
    weight: true,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            fullName: data.Full_name || '',
            email: data.email || '',
            birthdate: data.birthdate ? new Date(data.birthdate).toISOString().split('T')[0] : '',
            gender: data.gender || '',
            phoneNumber: data.phone_number || '',
            profileImage: data.profile_image || '',
            address: data.address || '',
            height: data.height ? data.height.toString() : '',
            weight: data.weight ? data.weight.toString() : '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled) {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Error', 'User not authenticated');
          setLoading(false);
          return;
        }

        const fileExt = result.assets[0].uri.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const base64Data = result.assets[0].base64;
        if (!base64Data) {
          throw new Error('Failed to get image data');
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64Data), {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(filePath, 31536000);

        if (!data?.signedUrl) {
          throw new Error('Failed to generate signed URL');
        }

        const signedUrl = data.signedUrl;

        const { error: updateError } = await supabase
          .from('user')
          .update({ profile_image: signedUrl })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        setFormData(prev => ({
          ...prev,
          profileImage: signedUrl
        }));

        await supabase
          .channel(`profile-update-${user.id}`)
          .send({
            type: 'broadcast',
            event: 'profile-image-changed',
            payload: { profile_image: signedUrl }
          });

        setLoading(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
      setLoading(false);
    }
  };

  const validateForm = () => {
    const validations = {
      fullName: formData.fullName.trim().length > 0,
      birthdate: /^\d{4}-\d{2}-\d{2}$/.test(formData.birthdate) || formData.birthdate === '',
      phoneNumber: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.phoneNumber) || formData.phoneNumber === '',
      height: (!formData.height || (parseFloat(formData.height) > 0 && parseFloat(formData.height) < 300)),
      weight: (!formData.weight || (parseFloat(formData.weight) > 0 && parseFloat(formData.weight) < 500)),
    };
    
    setIsValid(validations);
    return Object.values(validations).every(valid => valid);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check the highlighted fields for errors.');
      return;
    }
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        setSaving(false);
        return;
      }

      // First update the database
      const { error } = await supabase
        .from('user')
        .update({
          Full_name: formData.fullName,
          birthdate: formData.birthdate,
          gender: formData.gender,
          phone_number: formData.phoneNumber,
          address: formData.address,
          height: formData.height ? parseFloat(formData.height) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Add a small delay to ensure the database update is processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Broadcast the update to all components
      await supabase
        .channel(`profile-update-${user.id}`)
        .send({
          type: 'broadcast',
          event: 'profile-changed',
          payload: {
            fullName: formData.fullName,
            birthdate: formData.birthdate,
            gender: formData.gender,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            height: formData.height,
            weight: formData.weight
          }
        });

      // Also trigger a postgres change event to ensure all subscriptions catch it
      await supabase
        .from('user')
        .update({
          Full_name: formData.fullName,
        })
        .eq('user_id', user.id);

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message || JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const renderInputField = (
    label: string, 
    value: string, 
    key: string, 
    placeholder: string, 
    keyboardType: KeyboardTypeOptions = 'default', 
    multiline = false, 
    editable = true, 
    iconName: string | null = null,
    validate = true
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrapper, 
        validate && !isValid[key] && styles.invalidInput,
        !editable && styles.disabledInputWrapper
      ]}>
        {iconName && (
          <View style={styles.inputIcon}>
            <Feather name={iconName as any} size={18} color="#8000ff" />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput
          ]}
          value={value}
          onChangeText={(text) => {
            setFormData({ ...formData, [key]: text });
            if (validate) {
              setIsValid({ ...isValid, [key]: true });
            }
          }}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          editable={editable}
        />
      </View>
      {validate && !isValid[key] && (
        <Text style={styles.errorText}>
          {getErrorMessage(key)}
        </Text>
      )}
    </View>
  );

  const getErrorMessage = (key: string): string => {
    switch(key) {
      case 'fullName':
        return 'Name is required';
      case 'birthdate':
        return 'Use YYYY-MM-DD format';
      case 'phoneNumber':
        return 'Enter a valid phone number';
      case 'height':
        return 'Enter a valid height (0-300 cm)';
      case 'weight':
        return 'Enter a valid weight (0-500 kg)';
      default:
        return 'Invalid input';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8000ff" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar translucent backgroundColor="#000000" barStyle="light-content" />
      
      <MaskedView
        style={styles.headerContainer}
        maskElement={
          <LinearGradient
            colors={['rgba(128, 0, 255, 1)', 'rgba(128, 0, 255, 0.8)', 'rgba(128, 0, 255, 0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.headerMask}
          />
        }
      >
        <LinearGradient
          colors={['#9500ff', '#6a11cb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 40 }]}
        >
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <BlurView intensity={30} tint="light" style={styles.blurButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </LinearGradient>
      </MaskedView>

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer} 
            onPress={handleImageUpload}
            activeOpacity={0.9}
          >
            {formData.profileImage ? (
              <Image source={{ uri: formData.profileImage }} style={styles.profileImage} />
            ) : (
              <LinearGradient
                colors={['#e8dbff', '#f7f4ff']}
                style={styles.placeholderImage}
              >
                <Ionicons name="person" size={50} color="#8000ff" />
              </LinearGradient>
            )}
            <BlurView intensity={80} tint="light" style={styles.editImageButton}>
              <Feather name="camera" size={16} color="#8000ff" />
            </BlurView>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>
            {formData.fullName || 'Your Name'}
          </Text>
          <Text style={styles.profileEmail}>
            {formData.email || 'your.email@example.com'}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {renderInputField('Full Name', formData.fullName, 'fullName', 'Enter your full name', 'default', false, true, 'user')}
          
          {renderInputField('Email', formData.email, 'email', 'Email', 'email-address', false, false, 'mail', false)}
          
          {renderInputField('Birthdate', formData.birthdate, 'birthdate', 'YYYY-MM-DD', 'default', false, true, 'calendar')}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  formData.gender === 'male' && styles.selectedGender
                ]}
                onPress={() => setFormData({ ...formData, gender: 'male' })}
                activeOpacity={0.8}
              >
                <MaterialIcons 
                  name="male" 
                  size={20} 
                  color={formData.gender === 'male' ? '#fff' : '#8000ff'} 
                />
                <Text style={[
                  styles.genderText,
                  formData.gender === 'male' && styles.selectedGenderText
                ]}>Male</Text>
              </TouchableOpacity>
              <View style={styles.genderSpacer} />
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  formData.gender === 'female' && styles.selectedGender
                ]}
                onPress={() => setFormData({ ...formData, gender: 'female' })}
                activeOpacity={0.8}
              >
                <MaterialIcons 
                  name="female" 
                  size={20} 
                  color={formData.gender === 'female' ? '#fff' : '#8000ff'} 
                />
                <Text style={[
                  styles.genderText,
                  formData.gender === 'female' && styles.selectedGenderText
                ]}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>
  
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Physical Information</Text>
          
          {renderInputField('Height (cm)', formData.height, 'height', 'Enter your height in cm', 'numeric', false, true, 'arrow-up')}
          
          {renderInputField('Weight (kg)', formData.weight, 'weight', 'Enter your weight in kg', 'numeric', false, true, 'activity')}
  
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Information</Text>
          
          {renderInputField('Phone Number', formData.phoneNumber, 'phoneNumber', 'Enter your phone number', 'phone-pad', false, true, 'phone')}
          
          {renderInputField('Address', formData.address, 'address', 'Enter your address', 'default', true, true, 'map-pin', false)}
  
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.savingButton]} 
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" style={styles.saveIcon} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginTop: 12,
    color: '#8000ff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    height: 180,
  },
  headerMask: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  blurButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
    marginTop: -70,
  },
  contentContainer: {
    paddingBottom: 30,
    paddingTop: 0,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 0,
  },
  profileImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  inputIcon: {
    padding: 14,
    paddingRight: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  disabledInputWrapper: {
    backgroundColor: '#f9f9f9',
  },
  disabledInput: {
    color: '#888',
  },
  invalidInput: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderSpacer: {
    width: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectedGender: {
    backgroundColor: '#8000ff',
    borderColor: '#8000ff',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  selectedGenderText: {
    color: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#8000ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#8000ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  savingButton: {
    opacity: 0.8,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
