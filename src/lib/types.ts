// Shared types for UMPI

export interface User {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  image: string | null;
  phone: string | null;
  zone: string | null;
  bio: string | null;
  avatarInitials: string | null;
  role: string;
  plan: string;
  verified: boolean;
  memberSince: string;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  type: string;
  count: number;
  order: number;
}

export interface ListingSeller {
  id?: string;
  name: string | null;
  lastName: string | null;
  avatarInitials?: string | null;
  verified: boolean;
  plan: string;
  phone?: string | null;
  zone?: string | null;
  memberSince?: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryType: string;
  categoryId: string | null;
  category?: Category | null;
  price: number;
  currency: string;
  priceUnit: string | null;
  location: string | null;
  zone: string | null;
  province: string | null;
  images: string; // JSON string
  thumbs: string; // JSON string
  attrs: string; // JSON string
  rating: number;
  reviewCount: number;
  views: number;
  contactCount: number;
  badge: string | null;
  featured: boolean;
  featuredUntil: string | null;
  boostLevel: number;
  status: string;
  sellerId: string;
  seller?: ListingSeller | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  user?: User | null;
}

export interface Conversation {
  id: string;
  listingId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: User[];
  messages?: Message[];
  listing?: Listing | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  amount: number;
}

export interface Transaction {
  id: string;
  txId: string;
  userId: string;
  subscriptionId: string | null;
  boostId: string | null;
  concept: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  invoiceType: string | null;
  createdAt: string;
  user?: User | null;
}

export interface Boost {
  id: string;
  listingId: string;
  userId: string;
  type: string;
  durationDays: number;
  amount: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  listingId: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  reporter?: User | null;
  reportedUser?: User | null;
  listing?: Listing | null;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string | null;
  features: string; // JSON
  maxListings: number;
  maxFeatured: number;
  badgeVerified: boolean;
  top10Access: boolean;
  multiUser: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  monthlyReport: boolean;
  invoiceType: string | null;
  active: boolean;
  order: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
