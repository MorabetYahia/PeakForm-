import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, Dimensions, ScrollView, Platform, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 45) / 2; // 45 = 15*3 (padding and gap)

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

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('product')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== null) {
      filtered = filtered.filter(product => product.type === selectedType);
    }

    setFilteredProducts(filtered);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity 
        style={styles.productCardContent}
        onPress={() => router.push(`/product/${item.product_id}`)}
      >
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productType}>
            {PRODUCT_TYPES.find(type => type.id === item.type)?.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.addToCartButton}
        onPress={() => addToCart(item)}
      >
        <Text style={styles.addToCartButtonText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );

  const addToCart = async (product: Product) => {
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
        .eq('product_id', product.product_id)
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
            product_id: product.product_id,
            quantity: 1
          }]);

        if (insertError) throw insertError;
      }

      Alert.alert('Success', 'Item added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shop</Text>
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
          <Text style={styles.headerTitle}>Shop</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/Cart/cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#8000ff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, selectedType === null && styles.filterButtonActive]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[styles.filterText, selectedType === null && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {PRODUCT_TYPES.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[styles.filterButton, selectedType === type.id && styles.filterButtonActive]}
            onPress={() => setSelectedType(type.id)}
          >
            <Text style={[styles.filterText, selectedType === type.id && styles.filterTextActive]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={item => item.product_id}
          numColumns={2}
          contentContainerStyle={styles.productsGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8000ff']}
              tintColor="#8000ff"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop : 18 ,
    marginLeft : 10, 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 45,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    marginHorizontal: 15,
    marginBottom: 5,
  },
  filterContent: {
    paddingRight: 15,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    height: 40,
    justifyContent: 'center',
    marginBottom: 15,
    
  },
  filterButtonActive: {
    backgroundColor: '#8000ff',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  productsGrid: {
    padding: 15,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  productCardContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8000ff',
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
    color: '#ff0000',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8000ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  cartButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop : 18,
  },
  addToCartButton: {
    backgroundColor: '#8000ff',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});