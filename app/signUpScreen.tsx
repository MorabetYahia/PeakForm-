import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import supabase from './lib/supabase';
import uuid from 'react-native-uuid';

const { width, height } = Dimensions.get("window");

// Define types for form data and navigation
interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dateOfBirth: string;
  certificate: string;
  id: string;
}

const SignUpScreen = () => {
  const router = useRouter();
  const [isCoach, setIsCoach] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    dateOfBirth: "",
    certificate: "",
    id: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    try {
      if (!isValidEmail(formData.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (!formData.gender) {
        Alert.alert('Error', 'Please select your gender');
        return;
      }

      if (!formData.dateOfBirth) {
        Alert.alert('Error', 'Please select your date of birth');
        return;
      }

      // Check if user is at least 18 years old
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        Alert.alert(
          'Age Restriction',
          'You must be at least 18 years old to create an account',
          [
            {
              text: 'OK',
              style: 'default',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            }
          ],
          {
            cancelable: true,
            userInterfaceStyle: 'dark'
          }
        );
        return;
      }

      if (isCoach && (!formData.certificate || !formData.id)) {
        Alert.alert('Error', 'Certificate and ID are required for coaches');
        return;
      }

      setIsLoading(true);

      // Create user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            gender: formData.gender,
            birthdate: formData.dateOfBirth,
            user_type: isCoach ? 'coach' : 'client'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('20 seconds')) {
          Alert.alert(
            'Please Wait',
            'For security purposes, please wait 20 seconds before trying again.',
            [{ text: 'OK' }]
          );
        } else {
          throw authError;
        }
        return;
      }

      if (authData.user) {
        // Create user record in the database
        const { error: userError } = await supabase
          .from('user')
          .insert([
            {
              user_id: authData.user.id,
              Full_name: formData.fullName,
              email: formData.email,
              birthdate: formData.dateOfBirth,
              gender: formData.gender,
              creatad_at: new Date().toISOString(),
            }
          ]);

        if (userError) throw userError;

        // Create coach or client record based on user type
        const tableName = isCoach ? 'coach' : 'client';
        const recordData = isCoach 
          ? {
              coach_id: uuid.v4(),
              user_id: authData.user.id,
              certificate: formData.certificate,
              cin: formData.id,
            }
          : {
              client_id: uuid.v4(),
              user_id: authData.user.id,
            };

        const { error: typeError } = await supabase
          .from(tableName)
          .insert([recordData]);

        if (typeError) throw typeError;

        // Navigate to appropriate screen
        router.replace(isCoach ? '/(tabscoach)/home' : '/(tabsclient)/home');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      Alert.alert(
        'Error',
        'An error occurred during signup. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = date.toISOString().split('T')[0];
    handleChange("dateOfBirth", formattedDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const renderDatePicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowDatePicker(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView 
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContent}
                >
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        selectedDate.getMonth() + 1 === month && styles.selectedItem,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(month - 1);
                        handleDateChange(newDate);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedDate.getMonth() + 1 === month && styles.selectedItemText,
                      ]}>
                        {month.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView 
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContent}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDate.getDate() === day && styles.selectedItem,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const newDate = new Date(selectedDate);
                        newDate.setDate(day);
                        handleDateChange(newDate);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedDate.getDate() === day && styles.selectedItemText,
                      ]}>
                        {day.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView 
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerContent}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        selectedDate.getFullYear() === year && styles.selectedItem,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(year);
                        handleDateChange(newDate);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedDate.getFullYear() === year && styles.selectedItemText,
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={require("./pics/bg3.jpg")} style={styles.background}>
        <LinearGradient
          colors={['rgba(10, 10, 20, 0.6)', 'rgba(20, 20, 30, 0.85)']}
          style={styles.gradient}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.formContainer}
            >
              <Animated.View style={[
                styles.headerContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <Text style={styles.title}>
                  <Text style={{ color: "#fff" }}>Create </Text>
                  <Text style={{ color: "#b300ff" }}>Account</Text>
                </Text>

                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, !isCoach && styles.activeLabel]}>Client</Text>
                  <Switch 
                    value={isCoach} 
                    onValueChange={(value) => {
                      Haptics.selectionAsync();
                      setIsCoach(value);
                    }} 
                    trackColor={{ false: "#BC89FF", true: "#BC89FF" }}
                    thumbColor={isCoach ? "#b300ff" : "#b300ff"}
                    ios_backgroundColor="#BC89FF"
                    style={styles.switch}
                  />
                  <Text style={[styles.switchLabel, isCoach && styles.activeLabel]}>Coach</Text>
                </View>
              </Animated.View>

              {error ? (
                <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
                  <Ionicons name="alert-circle" size={18} color="#FF4D4D" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              <Animated.View style={[
                styles.inputsContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#aaa"
                    value={formData.fullName}
                    onChangeText={(text) => handleChange("fullName", text)}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => handleChange("email", text)}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPassword}
                    value={formData.password}
                    onChangeText={(text) => handleChange("password", text)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowPassword((prev) => !prev);
                    }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#ddd"
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showConfirmPassword}
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleChange("confirmPassword", text)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowConfirmPassword((prev) => !prev);
                    }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#ddd"
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={[
                      styles.dateText,
                      formData.dateOfBirth && styles.dateTextSelected
                    ]}>
                      {formData.dateOfBirth ? formatDate(selectedDate) : "Date of Birth"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === "male" && styles.selectedGenderButton,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleChange("gender", "male");
                    }}
                  >
                    <Ionicons 
                      name="male" 
                      size={22} 
                      color={formData.gender === "male" ? "#fff" : "#ddd"} 
                      style={{marginRight: 6}}
                    />
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === "male" && styles.selectedGenderText
                    ]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === "female" && styles.selectedGenderButton,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleChange("gender", "female");
                    }}
                  >
                    <Ionicons 
                      name="female" 
                      size={22} 
                      color={formData.gender === "female" ? "#fff" : "#ddd"} 
                      style={{marginRight: 6}}
                    />
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === "female" && styles.selectedGenderText
                    ]}>Female</Text>
                  </TouchableOpacity>
                </View>

                {isCoach && (
                  <>
                    <View style={styles.inputContainer}>
                      <Ionicons name="document-text-outline" size={22} color="#ddd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Certificate Number"
                        placeholderTextColor="#aaa"
                        value={formData.certificate}
                        onChangeText={(text) => handleChange("certificate", text)}
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Ionicons name="card-outline" size={22} color="#ddd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="ID Number"
                        placeholderTextColor="#aaa"
                        value={formData.id}
                        onChangeText={(text) => handleChange("id", text)}
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity 
                  onPress={handleSubmit} 
                  activeOpacity={0.7} 
                  style={styles.buttonContainer}
                  disabled={isLoading}
                >
                  <LinearGradient 
                    colors={["#b300ff", "#8000ff"]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.createButton}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.createText}>Creating Account</Text>
                        <View style={styles.loadingDots}>
                          <View style={[styles.loadingDot, styles.dot1]} />
                          <View style={[styles.loadingDot, styles.dot2]} />
                          <View style={[styles.loadingDot, styles.dot3]} />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.createText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[
                styles.footerContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.divider} />
                </View>
                
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/LoginScreen');
                  }} 
                  style={styles.signInContainer}
                >
                  <Text style={styles.footerText}>
                    Already have an account? <Text style={styles.signInText}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </KeyboardAvoidingView>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
      {renderDatePicker()}
    </View>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 5,
  },
  formContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  headerContainer: {
    width: "85%",
    marginBottom: 15,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 25,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  switchLabel: {
    fontSize: 16,
    color: "white",
    marginHorizontal: 10,
  },
  activeLabel: {
    color: "#BC89FF",
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 77, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: "85%",
    marginBottom: 15,
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 14,
    marginLeft: 8,
  },
  inputsContainer: {
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "85%",
    padding: 15,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    paddingVertical: 4,
  },
  eyeIcon: {
    padding: 5,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
    marginBottom: 15,
  },
  genderButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderRadius: 12,
    flex: 0.48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  genderButtonText: {
    color: "#ddd",
    fontSize: 16,
  },
  selectedGenderButton: {
    backgroundColor: "rgba(179, 0, 255, 0.6)",
    borderColor: "#b300ff",
  },
  selectedGenderText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonContainer: {
    width: "85%",
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "rgba(179, 0, 255, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  createButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  createText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  footerContainer: {
    width: "85%",
    alignItems: "center",
    marginTop: 25,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 15,
    fontSize: 14,
  },
  signInContainer: {
    marginBottom: 10,
  },
  footerText: {
    color: "#ddd",
    fontSize: 16,
  },
  signInText: {
    color: "#b300ff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingDots: {
    flexDirection: "row",
    marginLeft: 8,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginHorizontal: 2,
    opacity: 0.8,
  },
  dot1: {
    opacity: 0.4,
    transform: [{ scale: 0.8 }],
  },
  dot2: {
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  dot3: {
    opacity: 0.8,
    transform: [{ scale: 1 }],
  },
  dateInput: {
    flex: 1,
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 16,
    color: "#aaa",
  },
  dateTextSelected: {
    color: "#fff",
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
    width: '100%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerScroll: {
    flex: 1,
    maxHeight: 150,
  },
  pickerContent: {
    paddingVertical: 10,
  },
  pickerItem: {
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  selectedItem: {
    backgroundColor: 'rgba(179, 0, 255, 0.6)',
  },
  pickerItemText: {
    color: '#ddd',
    fontSize: 16,
  },
  selectedItemText: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
});
