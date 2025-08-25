import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import EscrowDetailPage from '../../components/escrow/EscrowDetailPage';

interface EscrowDetailProps {
  escrowId: string;
}

export default function EscrowDetail({ escrowId }: EscrowDetailProps) {
  return (
    <>
      <Head>
        <title>Escrow #{escrowId} - ChainTrust</title>
        <meta name="description" content={`View details and manage escrow contract #${escrowId} on ChainTrust`} />
        <meta name="robots" content="noindex, nofollow" />
        
        {/* Open Graph */}
        <meta property="og:title" content={`Escrow Contract #${escrowId} - ChainTrust`} />
        <meta property="og:description" content="Secure blockchain escrow contract details" />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`Escrow Contract #${escrowId} - ChainTrust`} />
        <meta name="twitter:description" content="Secure blockchain escrow contract details" />
      </Head>
      
      <EscrowDetailPage escrowId={escrowId} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  // Validate escrow ID (should be a positive integer)
  if (typeof id !== 'string' || !/^\d+$/.test(id) || parseInt(id) <= 0) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      escrowId: id,
    },
  };
};