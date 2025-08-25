import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for blockchain operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('chaintrust_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Clear invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chaintrust_token');
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface RegisterContentResponse {
  success: boolean;
  message: string;
  data: {
    contentHash: string;
    ipfsHash: string;
    ipfsUrl: string;
    title: string;
    description: string;
    isTransferable: boolean;
    owner: string;
    registeredAt: string;
    txHash: string;
    gasUsed: string;
    verificationUrl: string;
  };
}

export interface VerifyContentResponse {
  verified: boolean;
  contentHash: string;
  data?: {
    owner: string;
    ipfsHash: string;
    ipfsUrl: string;
    title: string;
    description: string;
    registeredAt: string;
    ipfsMetadata?: any;
  };
}

export interface FileHashResponse {
  contentHash: string;
  filename: string;
  size: number;
  mimeType: string;
  alreadyRegistered: boolean;
  owner?: string;
  registeredAt?: string;
}

export interface OwnerContentResponse {
  owner: string;
  totalContent: number;
  content: Array<{
    contentHash: string;
    owner: string;
    ipfsHash: string;
    ipfsUrl: string;
    title: string;
    description: string;
    registeredAt: string;
    timestamp: number;
    exists: boolean;
    verificationUrl: string;
    error?: string;
  }>;
}

export interface TransferOwnershipResponse {
  success: boolean;
  message: string;
  data: {
    contentHash: string;
    previousOwner: string;
    newOwner: string;
    transferredAt: string;
    txHash: string;
    gasUsed: string;
  };
}

// Ownership API functions
export const registerContent = async (formData: FormData): Promise<RegisterContentResponse> => {
  const response = await api.post('/ownership/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const verifyContent = async (contentHash: string): Promise<VerifyContentResponse> => {
  const response = await api.get(`/ownership/verify/${contentHash}`);
  return response.data;
};

export const generateFileHash = async (formData: FormData): Promise<FileHashResponse> => {
  const response = await api.post('/ownership/hash', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getOwnerContent = async (address: string): Promise<OwnerContentResponse> => {
  const response = await api.get(`/ownership/owner/${address}`);
  return response.data;
};

export const transferOwnership = async (data: {
  contentHash: string;
  newOwner: string;
  walletAddress: string;
}): Promise<TransferOwnershipResponse> => {
  const response = await api.post('/ownership/transfer', data);
  return response.data;
};

// Escrow API functions
export const createEscrow = async (data: {
  freelancer: string;
  mediator?: string;
  amount: number;
  token?: string;
  deadline: string;
  workDescription: string;
  title: string;
  category: string;
  milestones?: Array<{
    description: string;
    amount: number;
    dueDate: string;
  }>;
  clientWallet: string;
}) => {
  const response = await api.post('/escrow/create', data);
  return response.data;
};

export const fundEscrow = async (escrowId: number, data: {
  amount: number;
  token?: string;
  walletAddress: string;
}) => {
  const response = await api.post(`/escrow/${escrowId}/fund`, data);
  return response.data;
};

export const submitWork = async (escrowId: number, formData: FormData) => {
  const response = await api.post(`/escrow/${escrowId}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const approveWork = async (escrowId: number, walletAddress: string) => {
  const response = await api.post(`/escrow/${escrowId}/approve`, { walletAddress });
  return response.data;
};

export const raiseDispute = async (escrowId: number, data: { walletAddress: string }) => {
  const response = await api.post(`/escrow/${escrowId}/dispute`, data);
  return response.data;
};

export const resolveDispute = async (escrowId: number, data: {
  clientAmount: number;
  freelancerAmount: number;
  walletAddress: string;
}) => {
  const response = await api.post(`/escrow/${escrowId}/resolve`, data);
  return response.data;
};

export const getEscrowDetails = async (escrowId: number) => {
  const response = await api.get(`/escrow/${escrowId}`);
  return response.data;
};

export const getUserEscrows = async (address: string, type?: 'client' | 'freelancer') => {
  const url = type ? `/escrow/user/${address}?type=${type}` : `/escrow/user/${address}`;
  const response = await api.get(url);
  return response.data;
};

export const getEscrowStats = async () => {
  const response = await api.get('/escrow/stats');
  return response.data;
};

// Subscription Pool API functions (for future modules)
export const createSubscriptionPool = async (data: {
  serviceName: string;
  monthlyAmount: number;
  token?: string;
  maxMembers: number;
}) => {
  const response = await api.post('/subscription/create', data);
  return response.data;
};

export const joinSubscriptionPool = async (poolId: number, walletAddress: string) => {
  const response = await api.post(`/subscription/${poolId}/join`, { walletAddress });
  return response.data;
};

export const leaveSubscriptionPool = async (poolId: number, walletAddress: string) => {
  const response = await api.post(`/subscription/${poolId}/leave`, { walletAddress });
  return response.data;
};

export const makeManualPayment = async (poolId: number, walletAddress: string) => {
  const response = await api.post(`/subscription/${poolId}/payment`, { walletAddress });
  return response.data;
};

export const getPoolDetails = async (poolId: number) => {
  const response = await api.get(`/subscription/${poolId}`);
  return response.data;
};

export const getUserPools = async (address: string, type: 'owner' | 'member') => {
  const response = await api.get(`/subscription/user/${address}?type=${type}`);
  return response.data;
};

// Utility functions
export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidHash = (hash: string): boolean => {
  return /^[a-fA-F0-9]{64}$/.test(hash);
};

// Error handling utilities
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: any): boolean => {
  return !error.response && error.code !== 'ECONNABORTED';
};

export const isTimeoutError = (error: any): boolean => {
  return error.code === 'ECONNABORTED';
};

// Health check
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw new Error('API is not available');
  }
};

export default api;