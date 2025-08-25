import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalletProvider from '../providers/WalletProvider';

import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ChainTrust - Blockchain Proof of Ownership</title>
        <meta name="description" content="Register your digital content on the blockchain for immutable ownership verification. Protect your creative work with cryptographic proof that lasts forever." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="ChainTrust - Blockchain Proof of Ownership" />
        <meta property="og:description" content="Register your digital content on the blockchain for immutable ownership verification. Protect your creative work with cryptographic proof that lasts forever." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://chaintrust.app" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ChainTrust - Blockchain Proof of Ownership" />
        <meta name="twitter:description" content="Register your digital content on the blockchain for immutable ownership verification. Protect your creative work with cryptographic proof that lasts forever." />
        <meta name="twitter:image" content="/twitter-image.png" />
        
        {/* Additional meta tags */}
        <meta name="keywords" content="blockchain, proof of ownership, digital assets, copyright protection, IPFS, NFT, Web3, content registration" />
        <meta name="author" content="ChainTrust" />
        <meta name="robots" content="index, follow" />
        
        {/* Favicons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Component {...pageProps} />
            </div>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                  border: '1px solid var(--toast-border)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: 'white',
                  },
                },
              }}
            />
          </WalletProvider>
        </QueryClientProvider>
      </ThemeProvider>
      
      <style jsx global>{`
        :root {
          --toast-bg: #ffffff;
          --toast-color: #1f2937;
          --toast-border: #e5e7eb;
        }
        
        .dark {
          --toast-bg: #1f2937;
          --toast-color: #f9fafb;
          --toast-border: #374151;
        }
      `}</style>
    </>
  );
}