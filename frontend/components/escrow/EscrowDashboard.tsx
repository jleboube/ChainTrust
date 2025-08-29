import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { 
  PlusIcon,
  BriefcaseIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { getUserEscrows } from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';
import CreateEscrowForm from './CreateEscrowForm';
import EscrowCard from './EscrowCard';

interface EscrowItem {
  id: number;
  role: 'client' | 'freelancer';
  client: string;
  freelancer: string;
  mediator: string;
  amount: string;
  token: string;
  status: number;
  statusText: string;
  deadline: number;
  workDescription: string;
  deliveryHash: string;
  createdAt: number;
  lastUpdated: number;
  clientApproved: boolean;
  freelancerSubmitted: boolean;
  createdAtFormatted: string;
  deadlineFormatted: string;
  error?: string;
}

const EscrowDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [clientEscrows, setClientEscrows] = useState<EscrowItem[]>([]);
  const [freelancerEscrows, setFreelancerEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'deadline'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (isConnected && address) {
      loadEscrows();
    }
  }, [address, isConnected]);

  const loadEscrows = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      // Load both client and freelancer escrows
      const [clientData, freelancerData] = await Promise.all([
        getUserEscrows(address, 'client'),
        getUserEscrows(address, 'freelancer')
      ]);

      setClientEscrows(clientData.escrows || []);
      setFreelancerEscrows(freelancerData.escrows || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load escrows';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEscrowCreated = (escrowId: number) => {
    setShowCreateForm(false);
    loadEscrows(); // Refresh the list
    toast.success(`Escrow #${escrowId} created successfully!`);
  };

  const filterAndSortEscrows = (escrows: EscrowItem[]) => {
    let filtered = escrows.filter(escrow => {
      const matchesSearch = searchTerm === '' || 
        escrow.workDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        escrow.id.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || 
        escrow.statusText.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'amount':
          comparison = parseFloat(a.amount) - parseFloat(b.amount);
          break;
        case 'deadline':
          comparison = a.deadline - b.deadline;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getStatusCounts = (escrows: EscrowItem[]) => {
    return {
      all: escrows.length,
      created: escrows.filter(e => e.status === 0).length,
      funded: escrows.filter(e => e.status === 1).length,
      workSubmitted: escrows.filter(e => e.status === 2).length,
      completed: escrows.filter(e => e.status === 3).length,
      disputed: escrows.filter(e => e.status === 4).length
    };
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'created', label: 'Created' },
    { value: 'funded', label: 'Funded' },
    { value: 'work submitted', label: 'Work Submitted' },
    { value: 'completed', label: 'Completed' },
    { value: 'disputed', label: 'Disputed' }
  ];

  const tabs = [
    {
      name: 'As Client',
      count: clientEscrows.length,
      icon: BriefcaseIcon
    },
    {
      name: 'As Freelancer', 
      count: freelancerEscrows.length,
      icon: UserIcon
    }
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <BriefcaseIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to view and manage your escrow contracts.
        </p>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateEscrowForm
        onSuccess={handleEscrowCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Escrow Contracts
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your secure freelance payments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadEscrows}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            Refresh
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Escrow
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BriefcaseIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Escrows
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {clientEscrows.length + freelancerEscrows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Completed
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {[...clientEscrows, ...freelancerEscrows].filter(e => e.status === 3).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                In Progress
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {[...clientEscrows, ...freelancerEscrows].filter(e => e.status === 1 || e.status === 2).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Disputed
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {[...clientEscrows, ...freelancerEscrows].filter(e => e.status === 4).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search escrows by ID or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="deadline-asc">Deadline Soon</option>
              <option value="deadline-desc">Deadline Later</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.name}
              className={({ selected }) => `
                w-full rounded-lg py-3 px-4 text-sm font-medium leading-5 transition-all
                ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                ${selected
                  ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 shadow'
                  : 'text-blue-100 dark:text-blue-200 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <div className="flex items-center justify-center space-x-2">
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full px-2 py-1 text-xs font-medium">
                  {tab.count}
                </span>
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <EscrowList
              escrows={filterAndSortEscrows(clientEscrows)}
              loading={loading}
              error={error}
              role="client"
              onRefresh={loadEscrows}
            />
          </Tab.Panel>
          
          <Tab.Panel>
            <EscrowList
              escrows={filterAndSortEscrows(freelancerEscrows)}
              loading={loading}
              error={error}
              role="freelancer"
              onRefresh={loadEscrows}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

interface EscrowListProps {
  escrows: EscrowItem[];
  loading: boolean;
  error: string | null;
  role: 'client' | 'freelancer';
  onRefresh: () => void;
}

const EscrowList: React.FC<EscrowListProps> = ({ 
  escrows, 
  loading, 
  error, 
  role, 
  onRefresh 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <BriefcaseIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No escrows found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {role === 'client' 
            ? "You haven't created any escrow contracts yet."
            : "You don't have any escrow contracts as a freelancer yet."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {escrows.map((escrow, index) => (
          <motion.div
            key={escrow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <EscrowCard escrow={escrow} role={role} onUpdate={onRefresh} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default EscrowDashboard;