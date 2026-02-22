// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Wallet, JsonRpcProvider, parseEther } from 'ethers';
import { MONAD_CONFIG } from '../constants';

const SESSION_KEY = 'pixelwar_session_pk';
const MIN_BALANCE = parseEther('0.005');
const FUND_AMOUNT = parseEther('0.5');
const LOW_BALANCE_THRESHOLD = parseEther('0.01');

export const useSessionWallet = (provider) => {
  const [sessionWallet, setSessionWallet] = useState(null);
  const [sessionAddress, setSessionAddress] = useState(null);
  const [sessionBalance, setSessionBalance] = useState(0n);
  const [isFunding, setIsFunding] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const rpcProvider = useRef(null);
  const fundingInProgress = useRef(false);

  useEffect(() => {
    rpcProvider.current = new JsonRpcProvider(MONAD_CONFIG.rpcUrls[0]);
  }, []);

  useEffect(() => {
    if (!rpcProvider.current) return;
    let pk = sessionStorage.getItem(SESSION_KEY);
    let wallet;
    if (pk) {
      wallet = new Wallet(pk, rpcProvider.current);
    } else {
      wallet = Wallet.createRandom().connect(rpcProvider.current);
      sessionStorage.setItem(SESSION_KEY, wallet.privateKey);
    }
    setSessionWallet(wallet);
    setSessionAddress(wallet.address);
  }, []);

  useEffect(() => {
    if (!sessionWallet || !rpcProvider.current) return;
    const checkBalance = async () => {
      try {
        const bal = await rpcProvider.current.getBalance(sessionWallet.address);
        setSessionBalance(bal);
        setIsReady(bal >= MIN_BALANCE);
      } catch (e) {
        console.error('Balance check error:', e);
      }
    };
    checkBalance();
    const interval = setInterval(checkBalance, 8000);
    return () => clearInterval(interval);
  }, [sessionWallet]);

  const fundSession = async () => {
    if (!provider || !sessionWallet) return;
    setIsFunding(true);
    fundingInProgress.current = true;
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: sessionWallet.address,
        value: FUND_AMOUNT,
      });
      await tx.wait();
      const bal = await rpcProvider.current.getBalance(sessionWallet.address);
      setSessionBalance(bal);
      setIsReady(bal >= MIN_BALANCE);
      return true;
    } catch (e) {
      console.error('Fund session error:', e);
      throw e;
    } finally {
      setIsFunding(false);
      fundingInProgress.current = false;
    }
  };

  // Called before each paintCell — tops up if balance is low
  const ensureFunded = async () => {
    if (!sessionWallet || !rpcProvider.current) return false;
    // Wait if already funding
    if (fundingInProgress.current) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!fundingInProgress.current) { clearInterval(check); resolve(null); }
        }, 200);
      });
    }
    const bal = await rpcProvider.current.getBalance(sessionWallet.address);
    if (bal < LOW_BALANCE_THRESHOLD) {
      console.log('Session wallet low — auto-refilling...');
      await fundSession();
    }
    return true;
  };

  const getSessionSigner = () => {
    if (!sessionWallet || !rpcProvider.current) return null;
    return sessionWallet.connect(rpcProvider.current);
  };

  const drainSession = async () => {
    if (!provider || !sessionWallet || !rpcProvider.current) return;
    try {
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();
      const bal = await rpcProvider.current.getBalance(sessionWallet.address);
      if (bal === 0n) return;

      const feeData = await rpcProvider.current.getFeeData();
      // Prefer maxFeePerGas (EIP-1559), fall back to gasPrice
      const effectiveGasPrice = feeData.maxFeePerGas || feeData.gasPrice || 1000000000n;
      // 20% buffer on the 21000 gas limit for a plain ETH transfer
      const gasCost = (effectiveGasPrice * 21000n * 120n) / 100n;
      const sendAmount = bal - gasCost;
      if (sendAmount <= 0n) {
        console.log('Session wallet balance too low to cover drain gas — skipping');
        return;
      }

      const burnerSigner = sessionWallet.connect(rpcProvider.current);
      // Explicit gasLimit avoids estimateGas call (which fails on low-balance wallets)
      const tx = await burnerSigner.sendTransaction({
        to: userAddr,
        value: sendAmount,
        gasLimit: 21000n,
      });
      await tx.wait();
    } catch (e) {
      // Non-fatal — session wallet is ephemeral, losing leftover dust is acceptable
      console.warn('Drain session skipped:', e.code || e.message?.slice(0, 60));
    }
  };

  return {
    sessionWallet,
    sessionAddress,
    sessionBalance,
    isReady,
    isFunding,
    fundSession,
    ensureFunded,
    getSessionSigner,
    drainSession,
  };
};
