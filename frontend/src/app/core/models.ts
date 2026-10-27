export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  mrp: number;
  category: string;
  rating: number;
  stock: number;
  image: string;
  featured: boolean;
  createdAt: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface Category {
  name: string;
  count: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'customer';
  active: boolean;
  createdAt: string;
  orderCount?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

/** One line returned by POST /api/cart/validate */
export interface ValidatedLine {
  productId: number;
  name?: string;
  image?: string;
  category?: string;
  price?: number;
  stock?: number;
  requested: number;
  quantity: number;
  subtotal?: number;
  unavailable?: boolean;
}

export interface CartValidation {
  items: ValidatedLine[];
  total: number;
  issues: string[];
  valid: boolean;
}

export interface Shipping {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus = 'Placed' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  items: OrderItem[];
  shipping: Shipping;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
  statusHistory: { status: OrderStatus; at: string }[];
}

export interface AdminStats {
  products: number;
  outOfStock: number;
  lowStock: number;
  customers: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
}

export const ORDER_STATUSES: OrderStatus[] = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
export const MAX_QTY_PER_ITEM = 10;
