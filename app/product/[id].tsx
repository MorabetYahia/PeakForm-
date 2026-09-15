import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

const { width } = Dimensions.get('window');

interface Product {
  product_id: string;
  name: string;
  type: number;
  price: number;
  description: string;
  image_url: string;
  stock_quantity: number;
}

const PRODUCT_TYPES = [
  { id: 1, name: 'Equipment' },
  { id: 2, name: 'Nutrition' },
  { id: 3, name: 'Clothes' }
];

const generateDescription = (type: number) => {
  switch (type) {
    case 1: // Equipment
      return "This high-quality fitness equipment is designed to help you achieve your workout goals. Made with durable materials and ergonomic design, it's perfect for both beginners and professionals.";
    case 2: // Nutrition
      return "Premium quality nutrition product packed with essential nutrients and vitamins. Perfect for supporting your fitness journey and maintaining a healthy lifestyle.";
    case 3: // Clothes
      return "Comfortable and stylish fitness apparel made with breathable, moisture-wicking fabric. Perfect for workouts and active lifestyle.";
    default:
      return "Premium quality product designed to enhance your fitness journey.";
  }
};

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, check if we can connect to Supabase
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        setError('Authentication error. Please try again.');
        return;
      }

      // Then fetch the product
      const { data, error } = await supabase
        .from('product')
        .select('*')
        .eq('product_id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product. Please try again.');
        return;
      }

      if (!data) {
        setError('Product not found');
        return;
      }

      console.log('Product data:', data); // Debug log
      setProduct(data);
    } catch (error) {
      console.error('Error in fetchProduct:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to add items to cart');
        return;
      }

      // Get or create cart
      const { data: cart, error: cartError } = await supabase
        .from('shopping_cart')
        .select('cart_id')
        .eq('user_id', user.id)
        .single();

      let cartId;
      if (cartError || !cart) {
        // Generate a new UUID for the cart
        const newCartId = uuidv4();
        
        // Create new cart with the generated ID
        const { data: newCart, error: createError } = await supabase
          .from('shopping_cart')
          .insert([{ 
            cart_id: newCartId,
            user_id: user.id, 
            total_amount: 0 
          }])
          .select()
          .single();

        if (createError) throw createError;
        cartId = newCart.cart_id;
      } else {
        cartId = cart.cart_id;
      }

      // Check if item already exists in cart
      const { data: existingItem, error: itemError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('product_id', product?.product_id)
        .single();

      if (itemError && itemError.code !== 'PGRST116') throw itemError;

      if (existingItem) {
        // Update quantity if item exists
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('cart_item_id', existingItem.cart_item_id);

        if (updateError) throw updateError;
      } else {
        // Add new item to cart
        const newCartItemId = uuidv4();
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            cart_item_id: newCartItemId,
            cart_id: cartId,
            product_id: product?.product_id,
            quantity: 1
          }]);

        if (insertError) throw insertError;
      }

      Alert.alert('Success', 'Item added to cart!');
      router.push('/Cart/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#8000ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8000ff" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#8000ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#8000ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#8000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product.name}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/Cart/cart')}
        >
          <Ionicons name="cart-outline" size={22} color="#8000ff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={50} color="#ccc" />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
          
          <View style={styles.stockContainer}>
            <Text style={styles.stockText}>
              {product.stock_quantity > 0 
                ? `In Stock: ${product.stock_quantity} available` 
                : "Out of Stock"}
            </Text>
          </View>

          <View style={styles.typeContainer}>
            <Text style={styles.typeText}>
              Type: {PRODUCT_TYPES.find(type => type.id === product.type)?.name || 'Unknown'}
            </Text>
          </View>

          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {product.description || 'No description available'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={addToCart}
        >
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    backgroundColor: '#f8f8f8',
    marginBottom: 20,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    paddingHorizontal: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8000ff',
    marginBottom: 10,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockText: {
    fontSize: 16,
    color: '#555',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addToCartButton: {
    backgroundColor: '#8000ff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeText: {
    fontSize: 16,
    color: '#555',
  },
});