import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  description: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const EscrowStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Simulate loading for demo
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  // Mock statistics data
  const mockStats = {
    totalEscrows: 1247,
    totalValue: 2547832.45,
    completedEscrows: 1189,
    activeEscrows: 45,
    disputedEscrows: 13,
    successRate: 98.2,
    avgEscrowAmount: 2043.67,
    totalUsers: 892
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Escrows',
      value: mockStats.totalEscrows.toLocaleString(),
      icon: ChartBarIcon,
      color: 'blue',
      description: 'All-time escrow contracts created',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: 'Total Value Secured',
      value: `$${(mockStats.totalValue / 1000000).toFixed(2)}M`,
      icon: CurrencyDollarIcon,
      color: 'green',
      description: 'Total USD value processed through escrows',
      change: '+23.1%',
      changeType: 'positive'
    },
    {
      title: 'Completed Escrows',
      value: mockStats.completedEscrows.toLocaleString(),
      icon: CheckCircleIcon,
      color: 'emerald',
      description: 'Successfully completed projects',
      change: '+15.8%',
      changeType: 'positive'
    },
    {
      title: 'Active Escrows',
      value: mockStats.activeEscrows.toString(),
      icon: ClockIcon,
      color: 'yellow',
      description: 'Currently in progress',
      change: '+2',
      changeType: 'positive'
    },
    {
      title: 'Success Rate',
      value: `${mockStats.successRate}%`,
      icon: TrophyIcon,
      color: 'purple',
      description: 'Escrows completed without disputes',
      change: '+0.3%',
      changeType: 'positive'
    },
    {
      title: 'Active Users',
      value: mockStats.totalUsers.toLocaleString(),
      icon: UserGroupIcon,
      color: 'indigo',
      description: 'Clients and freelancers using the platform',
      change: '+8.9%',
      changeType: 'positive'
    },
    {
      title: 'Avg Escrow Value',
      value: `$${mockStats.avgEscrowAmount.toLocaleString()}`,
      icon: ArrowTrendingUpIcon,
      color: 'rose',
      description: 'Average value per escrow contract',
      change: '+$127',
      changeType: 'positive'
    },
    {
      title: 'Disputed Escrows',
      value: mockStats.disputedEscrows.toString(),
      icon: ExclamationTriangleIcon,
      color: 'red',
      description: 'Currently under mediation',
      change: '-2',
      changeType: 'positive'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
      yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
      purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
      rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
      red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Platform Statistics
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time metrics from the ChainTrust escrow platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.change && (
                <div className={`text-sm font-medium ${getChangeColor(stat.changeType!)}`}>
                  {stat.change}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {stat.title}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {stat.description}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Platform Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Platform Health</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-200 text-sm">Healthy</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold mb-1">{mockStats.successRate}%</div>
            <div className="text-green-200 text-sm">Success Rate</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold mb-1">{(mockStats.disputedEscrows / mockStats.totalEscrows * 100).toFixed(1)}%</div>
            <div className="text-green-200 text-sm">Dispute Rate</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold mb-1">1.2s</div>
            <div className="text-green-200 text-sm">Avg Response Time</div>
          </div>
        </div>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Escrow Categories
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">By Work Type</h4>
            <div className="space-y-3">
              {[
                { category: 'Development', percentage: 42, count: 524 },
                { category: 'Design', percentage: 28, count: 349 },
                { category: 'Writing', percentage: 18, count: 224 },
                { category: 'Marketing', percentage: 8, count: 100 },
                { category: 'Other', percentage: 4, count: 50 }
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[80px]">
                      {item.category}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 ml-3">
                    {item.percentage}% ({item.count})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Distribution */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">By Value Range</h4>
            <div className="space-y-3">
              {[
                { range: '$0-$500', percentage: 35, count: 437 },
                { range: '$500-$2K', percentage: 32, count: 399 },
                { range: '$2K-$10K', percentage: 25, count: 312 },
                { range: '$10K-$50K', percentage: 6, count: 75 },
                { range: '$50K+', percentage: 2, count: 24 }
              ].map((item) => (
                <div key={item.range} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[80px]">
                      {item.range}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 ml-3">
                    {item.percentage}% ({item.count})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Statistics updated in real-time from blockchain data • Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default EscrowStats;