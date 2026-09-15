import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

interface Product {
  name: string;
  price: number;
  image_url: string;
}

interface CartItem {
  cart_item_id: string;
  product_id: string;
  quantity: number;
  product: Product;
}

interface SupabaseCartItem {
  cart_item_id: string;
  product_id: string;
  quantity: number;
  product: Product;
}

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      // Get the user's cart
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to view your cart');
        return;
      }

      // Get the user's cart
      const { data: cart, error: cartError } = await supabase
        .from('shopping_cart')
        .select('cart_id')
        .eq('user_id', user.id)
        .single();

      // If no cart exists or error occurs, just set empty cart items
      if (cartError || !cart) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Get cart items with product details
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          cart_item_id,
          product_id,
          quantity,
          product:product_id (
            name,
            price,
            image_url
          )
        `)
        .eq('cart_id', cart.cart_id);

      // If no items or error occurs, just set empty cart items
      if (itemsError || !items) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Transform the data to match our interface
      const transformedItems = items.map((item: any) => {
        // Check if product data exists
        if (!item.product) {
          console.warn('Invalid product data for item:', item);
          return null;
        }

        // Handle both array and object cases
        const productData = Array.isArray(item.product) ? item.product[0] : item.product;

        return {
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: {
            name: productData.name || 'Unknown Product',
            price: productData.price || 0,
            image_url: productData.image_url || 'https://via.placeholder.com/150'
          }
        };
      }).filter((item): item is CartItem => item !== null);

      setCartItems(transformedItems);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      // Instead of showing error, just set empty cart
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_item_id', cartItemId);

      if (error) throw error;
      setCartItems(items => items.filter(item => item.cart_item_id !== cartItemId));
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'Failed to remove item from cart');
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={styles.emptySpace} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading cart...</Text>
        </View>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={styles.emptySpace} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Looks like you haven't added any items to your cart yet.
          </Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/(tabscoach)/shop')}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={styles.emptySpace} />
      </View>

      <ScrollView style={styles.cartList}>
        {cartItems.map((item) => (
          <View key={item.cart_item_id} style={styles.cartItem}>
            <Image
              source={{ uri: item.product.image_url || 'https://via.placeholder.com/150' }}
              style={styles.productImage}
            />
            <View style={styles.itemDetails}>
              <Text style={styles.productName}>{item.product.name}</Text>
              <Text style={styles.productPrice}>${item.product.price.toFixed(2)}</Text>
              <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
            </View>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeItem(item.cart_item_id)}
            >
              <Ionicons name="trash-outline" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total:</Text>
          <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton}>
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop : 40,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptySpace: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8000ff',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8000ff',
  },
  checkoutButton: {
    backgroundColor: '#8000ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});