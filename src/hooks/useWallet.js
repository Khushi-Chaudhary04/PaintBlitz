import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { MONAD_CONFIG, EXPECTED_CHAIN_ID } from '../constants';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!window.ethereum) return;
    const eth = window.ethereum;
    if (typeof eth.on === 'function') {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (typeof eth.removeListener === 'function') {
        eth.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setProvider(null);
      setChainId(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const switchToMONAD = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_CONFIG.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('No EVM wallet detected. Please install MetaMask.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      await switchToMONAD();
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const ethersProvider = new BrowserProvider(window.ethereum);
      const network = await ethersProvider.getNetwork();
      setProvider(ethersProvider);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Wallet connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
  };

  return {
    account,
    provider,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    isConnected: !!account,
  };
};