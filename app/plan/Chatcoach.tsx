import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import supabase from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

type Message = {
  message_id: string;
  message_text: string;
  sender_user_id: string;
  sent_at: string;
  is_sender: boolean;
  sender_name: string;
  sender_image: string;
};

type ChatSession = {
  chat_session_id: string;
  client_plan_id: string;
  client_id: string;
  coach_id: string;
  plan_id: string;
};

type UserData = {
  Full_name: string;
  profile_image: string | null;
  email: string;
};

type CoachData = {
  coach_id: string;
  user_id: string;
  certificate: string | null;
  cin: string;
  rating: number;
  revenue: number;
  user: UserData;
};

export default function ChatCoach() {
  const router = useRouter();
  const { clientId, coachId } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherUserInfo, setOtherUserInfo] = useState<UserData | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserData | null>(null);
  const [sending, setSending] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize chat session
  const initializeChatSession = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Determine if current user is coach or client
      const { data: coachData } = await supabase
        .from('coach')
        .select('coach_id')
        .eq('user_id', user.id)
        .single();

      const isUserCoach = !!coachData;
      setIsCoach(isUserCoach);

      // Get current user info
      const { data: currentUserData } = await supabase
        .from('user')
        .select('Full_name, profile_image, email')
        .eq('user_id', user.id)
        .single();

      if (currentUserData) {
        setCurrentUserInfo(currentUserData as UserData);
      }

      // Get other user info (coach or client)
      if (isUserCoach) {
        // If current user is coach, fetch client info
        const { data: clientData } = await supabase
          .from('client')
          .select(`
            user:user_id (
              Full_name,
              profile_image,
              email
            )
          `)
          .eq('client_id', clientId)
          .single();

        if (clientData?.user) {
          setOtherUserInfo(clientData.user as unknown as UserData);
        }
      } else {
        // If current user is client, fetch coach info
        const { data: coachData } = await supabase
          .from('coach')
          .select(`
            coach_id,
            user:user_id (
              Full_name,
              profile_image,
              email
            )
          `)
          .eq('coach_id', coachId)
          .single();

        if (coachData?.user) {
          setOtherUserInfo(coachData.user as unknown as UserData);
        }
      }

      // Get client_plan_id
      let clientPlanData;
      if (isUserCoach) {
        // If current user is coach, get the client's plan
        const { data, error: planError } = await supabase
          .from('client_plan')
          .select('client_plan_id, plan_id')
          .eq('client_id', clientId)
          .order('purchase_date', { ascending: false })
          .limit(1)
          .single();

        if (planError) {
          console.error('Plan error:', planError);
          Alert.alert('Error', 'Failed to fetch plan information');
          return;
        }
        clientPlanData = data;
      } else {
        // If current user is client, get their plan
        const { data, error: planError } = await supabase
          .from('client_plan')
          .select('client_plan_id, plan_id')
          .eq('client_id', user.id)
          .order('purchase_date', { ascending: false })
          .limit(1)
          .single();

        if (planError) {
          console.error('Plan error:', planError);
          Alert.alert('Error', 'Failed to fetch plan information');
          return;
        }
        clientPlanData = data;
      }

      if (!clientPlanData) {
        Alert.alert('Error', 'No active plan found');
        return;
      }

      // Check if chat session exists
      let { data: existingSession, error: sessionError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('client_plan_id', clientPlanData.client_plan_id)
        .single();

      if (!existingSession) {
        // Get the correct coach_id and client_id
        let actualCoachId, actualClientId;

        if (isUserCoach) {
          // If current user is coach, use their coach_id and the provided client_id
          actualCoachId = coachData.coach_id;
          actualClientId = clientId;
        } else {
          // If current user is client, use the provided coach_id and get their client_id
          actualCoachId = coachId;
          const { data: clientData } = await supabase
            .from('client')
            .select('client_id')
            .eq('user_id', user.id)
            .single();
          
          if (!clientData) {
            Alert.alert('Error', 'Client information not found');
            return;
          }
          actualClientId = clientData.client_id;
        }

        // Create new chat session
        const { data: newSession, error: createError } = await supabase
          .from('chat_session')
          .insert({
            client_plan_id: clientPlanData.client_plan_id,
            client_id: actualClientId,
            coach_id: actualCoachId,
            plan_id: clientPlanData.plan_id
          })
          .select()
          .single();

        if (createError) {
          console.error('Create session error:', createError);
          Alert.alert('Error', 'Failed to create chat session');
          return;
        }
        existingSession = newSession;
      }

      setChatSession(existingSession);
      await fetchMessages(existingSession.chat_session_id);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages
  const fetchMessages = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messagesData, error } = await supabase
        .from('chat_message')
        .select(`
          *,
          sender:sender_user_id (
            Full_name,
            profile_image
          )
        `)
        .eq('chat_session_id', sessionId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      if (messagesData) {
        const formattedMessages = messagesData.map(msg => ({
          message_id: msg.message_id,
          message_text: msg.message_text,
          sender_user_id: msg.sender_user_id,
          sent_at: msg.sent_at,
          is_sender: msg.sender_user_id === user.id,
          sender_name: msg.sender?.Full_name || 'Unknown',
          sender_image: msg.sender?.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!chatSession) return;

    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message',
          filter: `chat_session_id=eq.${chatSession.chat_session_id}`
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Don't add the message if it's from the current user (already added)
          if (payload.new.sender_user_id === user.id) return;

          // Fetch sender info for the new message
          const { data: senderData } = await supabase
            .from('user')
            .select('Full_name, profile_image')
            .eq('user_id', payload.new.sender_user_id)
            .single();

          const newMessage: Message = {
            message_id: payload.new.message_id,
            message_text: payload.new.message_text,
            sender_user_id: payload.new.sender_user_id,
            sent_at: payload.new.sent_at,
            is_sender: false,
            sender_name: senderData?.Full_name || 'Unknown',
            sender_image: senderData?.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
          };

          setMessages(prev => [...prev, newMessage]);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatSession]);

  useEffect(() => {
    initializeChatSession();
  }, [clientId, coachId]);

  const handleSend = async () => {
    if (!message.trim() || !chatSession || sending) return;

    const tempMessageId = `temp-${Date.now()}`;
    
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the message object
      const newMessage: Message = {
        message_id: tempMessageId,
        message_text: message.trim(),
        sender_user_id: user.id,
        sent_at: new Date().toISOString(),
        is_sender: true,
        sender_name: currentUserInfo?.Full_name || 'You',
        sender_image: currentUserInfo?.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg'
      };

      // Add message to local state immediately
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      inputRef.current?.focus();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send to database
      const { error } = await supabase
        .from('chat_message')
        .insert({
          chat_session_id: chatSession.chat_session_id,
          sender_user_id: user.id,
          message_text: message.trim()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg.message_id !== tempMessageId));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      <View style={[styles.header, { backgroundColor: '#6C63FF' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Image 
              source={{ uri: otherUserInfo?.profile_image || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
              style={styles.headerImage}
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{otherUserInfo?.Full_name || 'Loading...'}</Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View 
            key={msg.message_id} 
            style={[
              styles.messageWrapper,
              msg.is_sender ? styles.sentMessageWrapper : styles.receivedMessageWrapper,
              index === 0 || messages[index - 1]?.sender_user_id !== msg.sender_user_id ? styles.messageSpacing : null
            ]}
          >
            {!msg.is_sender && (
              <Image 
                source={{ uri: msg.sender_image }} 
                style={styles.messageAvatar}
              />
            )}
            <View style={[
              styles.messageBubble,
              msg.is_sender ? styles.sentMessage : styles.receivedMessage
            ]}>
              {!msg.is_sender && (
                <Text style={styles.senderName}>{msg.sender_name}</Text>
              )}
              <Text style={[
                styles.messageText,
                msg.is_sender ? styles.sentMessageText : styles.receivedMessageText
              ]}>
                {msg.message_text}
              </Text>
              <Text style={[
                styles.messageTime,
                msg.is_sender ? styles.sentMessageTime : styles.receivedMessageTime
              ]}>
                {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {msg.is_sender && (
              <Image 
                source={{ uri: msg.sender_image }} 
                style={styles.messageAvatar}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachmentButton}>
          <Ionicons name="attach" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { height: Math.min(Math.max(message.split('\n').length * 20, 40), 100) }
          ]}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons 
              name="send" 
              size={24} 
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 15,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  messageSpacing: {
    marginTop: 16,
  },
  sentMessageWrapper: {
    justifyContent: 'flex-end',
  },
  receivedMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sentMessage: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
    marginLeft: 8,
  },
  receivedMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attachmentButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 77 : 57,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
