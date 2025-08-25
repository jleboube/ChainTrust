import React, { ReactNode } from 'react';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { polygon, polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { infuraProvider } from 'wagmi/providers/infura';
import {
  getDefaultWallets,
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';

interface WalletProviderProps {
  children: ReactNode;
}

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    // Use Polygon Mumbai for development, Polygon mainnet for production
    process.env.NODE_ENV === 'production' ? polygon : polygonMumbai,
  ],
  [
    // Priority order: Alchemy > Infura > Public
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
      ? [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY })] 
      : []
    ),
    ...(process.env.NEXT_PUBLIC_INFURA_API_KEY
      ? [infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_API_KEY })]
      : []
    ),
    publicProvider(),
  ]
);

// Configure wallets
const { connectors } = getDefaultWallets({
  appName: 'ChainTrust',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'chaintrust',
  chains,
});

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

// Custom RainbowKit theme
const customTheme = {
  light: {
    ...lightTheme(),
    colors: {
      ...lightTheme().colors,
      accentColor: '#2563eb', // Blue-600
      accentColorForeground: 'white',
      actionButtonBorder: '#e5e7eb', // Gray-200
      actionButtonBorderMobile: '#e5e7eb',
      actionButtonSecondaryBackground: '#f3f4f6', // Gray-100
      closeButton: '#6b7280', // Gray-500
      closeButtonBackground: '#f9fafb', // Gray-50
      connectButtonBackground: '#ffffff',
      connectButtonBackgroundError: '#fee2e2', // Red-100
      connectButtonInnerBackground: '#f9fafb',
      connectButtonText: '#111827', // Gray-900
      connectButtonTextError: '#dc2626', // Red-600
      connectionIndicator: '#10b981', // Emerald-500
      downloadBottomCardBackground: 'linear-gradient(126deg, rgba(37, 99, 235, 0.1) 9.49%, rgba(147, 51, 234, 0.1) 71.04%)',
      downloadTopCardBackground: 'linear-gradient(126deg, rgba(37, 99, 235, 0.1) 9.49%, rgba(147, 51, 234, 0.1) 71.04%)',
      error: '#dc2626',
      generalBorder: '#e5e7eb',
      generalBorderDim: '#f3f4f6',
      menuItemBackground: '#f9fafb',
      modalBackdrop: 'rgba(0, 0, 0, 0.3)',
      modalBackground: '#ffffff',
      modalBorder: '#e5e7eb',
      modalText: '#111827',
      modalTextDim: '#6b7280',
      modalTextSecondary: '#374151',
      profileAction: '#f3f4f6',
      profileActionHover: '#e5e7eb',
      profileForeground: '#ffffff',
      selectedOptionBorder: '#2563eb',
      standby: '#fbbf24', // Amber-400
    },
    radii: {
      ...lightTheme().radii,
      actionButton: '8px',
      connectButton: '12px',
      menuButton: '12px',
      modal: '16px',
      modalMobile: '16px',
    },
  },
  dark: {
    ...darkTheme(),
    colors: {
      ...darkTheme().colors,
      accentColor: '#3b82f6', // Blue-500
      accentColorForeground: 'white',
      actionButtonBorder: '#374151', // Gray-700
      actionButtonBorderMobile: '#374151',
      actionButtonSecondaryBackground: '#1f2937', // Gray-800
      closeButton: '#9ca3af', // Gray-400
      closeButtonBackground: '#1f2937',
      connectButtonBackground: '#111827', // Gray-900
      connectButtonBackgroundError: '#7f1d1d', // Red-900
      connectButtonInnerBackground: '#1f2937',
      connectButtonText: '#f9fafb', // Gray-50
      connectButtonTextError: '#fca5a5', // Red-300
      connectionIndicator: '#34d399', // Emerald-400
      downloadBottomCardBackground: 'linear-gradient(126deg, rgba(59, 130, 246, 0.1) 9.49%, rgba(168, 85, 247, 0.1) 71.04%)',
      downloadTopCardBackground: 'linear-gradient(126deg, rgba(59, 130, 246, 0.1) 9.49%, rgba(168, 85, 247, 0.1) 71.04%)',
      error: '#ef4444', // Red-500
      generalBorder: '#374151',
      generalBorderDim: '#1f2937',
      menuItemBackground: '#1f2937',
      modalBackdrop: 'rgba(0, 0, 0, 0.5)',
      modalBackground: '#111827',
      modalBorder: '#374151',
      modalText: '#f9fafb',
      modalTextDim: '#9ca3af',
      modalTextSecondary: '#d1d5db', // Gray-300
      profileAction: '#1f2937',
      profileActionHover: '#374151',
      profileForeground: '#111827',
      selectedOptionBorder: '#3b82f6',
      standby: '#f59e0b', // Amber-500
    },
  },
};

const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={theme === 'dark' ? customTheme.dark : customTheme.light}
        modalSize="compact"
        initialChain={process.env.NODE_ENV === 'production' ? polygon : polygonMumbai}
        showRecentTransactions={true}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default WalletProvider;