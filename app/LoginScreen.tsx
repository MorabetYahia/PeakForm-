import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import supabase from './lib/supabase';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async () => {
    try {
      if (!isValidEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      setIsLoading(true);

      // First try to sign in with password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // If there's an error about email not being confirmed, show specific message
        if (authError.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email Verification Required',
            'Please verify your email before logging in.'
          );
          return;
        }
        throw authError;
      }

      if (authData.user) {
        // Check if user is a coach or client
        const { data: coachData, error: coachError } = await supabase
          .from('coach')
          .select('coach_id')
          .eq('user_id', authData.user.id)
          .single();

        if (coachError && coachError.code !== 'PGRST116') throw coachError;

        if (coachData) {
          router.replace('/(tabscoach)/home');
        } else {
          router.replace('/(tabsclient)/home');
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert(
        'Error',
        'Invalid email or password'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
                styles.logoContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <Text style={styles.title}>
                  <Text style={{ color: "#fff" }}>Log</Text>
                  <Text style={{ color: "#fff" }}>in</Text>
                </Text>
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
                  <Ionicons name="mail-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
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

                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/Forgetpw');
                  }}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleLogin} 
                  activeOpacity={0.7} 
                  style={styles.buttonContainer}
                  disabled={isLoading}
                >
                  <LinearGradient 
                    colors={["#b300ff", "#8000ff"]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.loginButton}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.loginText}>Logging in</Text>
                        <View style={styles.loadingDots}>
                          <View style={[styles.loadingDot, styles.dot1]} />
                          <View style={[styles.loadingDot, styles.dot2]} />
                          <View style={[styles.loadingDot, styles.dot3]} />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.loginText}>Log In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[
                styles.signUpContainer, 
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
                    router.push('/signUpScreen');
                  }} 
                  style={styles.signUpButton}
                >
                  <Text style={styles.footerText}>
                    Don't have an account? <Text style={styles.signUpText}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </KeyboardAvoidingView>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

export default LoginScreen;

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
    paddingVertical: 40,
  },
  formContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#ddd",
    marginBottom: 15,
  },
  inputsContainer: {
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: "90%",
    padding: 15,
    borderRadius: 25,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
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
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginRight: "5%",
    marginBottom: 20,
  },
  forgotPassword: {
    color: "#ddd",
    fontSize: 14,
  },
  buttonContainer: {
    width: "90%",
    marginTop: 10,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#b300ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loginButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loginText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginHorizontal: 2,
    opacity: 0.7,
  },
  dot1: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationIterationCount: 'infinite',
  },
  dot2: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationDelay: '0.1s',
    animationIterationCount: 'infinite',
  },
  dot3: {
    animationName: 'bounce',
    animationDuration: '0.6s',
    animationDelay: '0.2s',
    animationIterationCount: 'infinite',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 77, 77, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    width: "90%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.3)",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 14,
    marginLeft: 6,
  },
  signUpContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 30,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  signUpButton: {
    padding: 10,
  },
  footerText: {
    color: "#ddd",
    fontSize: 16,
  },
  signUpText: {
    color: "#b300ff",
    fontSize: 16,
    fontWeight: "600",
  },
  eyeIcon: {
    padding: 8,
  },
});