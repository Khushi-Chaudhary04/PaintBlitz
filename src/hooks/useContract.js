// @ts-nocheck
import { Contract, parseEther } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants';

/**
 * @param {import('ethers').BrowserProvider} provider
 * @param {(() => import('ethers').Wallet | null) | null} getSessionSigner
 * @param {(() => Promise<boolean>) | null} ensureFunded
 */
export const useContract = (provider, getSessionSigner = null, ensureFunded = null) => {

  const getReadContract = async () => {
    if (!provider) return null;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const getMetaMaskContract = async () => {
    if (!provider) return null;
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  const getSessionContract = () => {
    if (!getSessionSigner) return null;
    const signer = getSessionSigner();
    if (!signer) return null;
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  // ── MetaMask actions ──────────────────────────────────────────────────────────

  const createGame = async (gridSize, gameDuration, maxPlayers, stakeAmount) => {
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const stake = parseEther(stakeAmount.toString());
    const tx = await contract.createGame(gridSize, gameDuration, maxPlayers, stake, { value: stake });
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === 'GameCreated');
    return event ? Number(event.args.gameId) : null;
  };

  const joinGame = async (gameId) => {
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const signer = await provider.getSigner();
    const myAddr = await signer.getAddress();

    const info = await contract.getGameInfo(gameId);
    const stakeAmount = info[6];
    const started = info[8];
    const finished = info[9];
    const players = [...info[1]];
    const maxPlayers = Number(info[5]);

    if (finished) throw new Error('Game already finished');
    if (started) throw new Error('Game already started');
    if (players.map(p => p.toLowerCase()).includes(myAddr.toLowerCase())) {
      throw new Error('You already joined this game');
    }
    if (players.length >= maxPlayers) throw new Error('Game is full');

    const stake = BigInt(stakeAmount.toString());
    const calldata = contract.interface.encodeFunctionData('joinGame', [BigInt(gameId)]);
    const tx = await signer.sendTransaction({
      to: CONTRACT_ADDRESS,
      data: calldata,
      value: stake,
    });
    await tx.wait();
  };

  const registerSession = async (gameId, sessionAddress) => {
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const tx = await contract.registerSession(gameId, sessionAddress);
    await tx.wait();
  };

  const startGame = async (gameId) => {
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const tx = await contract.startGame(gameId);
    await tx.wait();
  };

  const endGame = async (gameId) => {
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const tx = await contract.endGame(gameId);
    await tx.wait();
  };

  // ── Session wallet — auto-refills if low on gas ───────────────────────────────

  const paintCell = async (gameId, x, y) => {
    const sessionContract = getSessionContract();
    if (sessionContract) {
      if (ensureFunded) {
        try {
          await ensureFunded();
        } catch (e) {
          console.warn('Could not refill session wallet:', e.message);
        }
      }
      const tx = await sessionContract.paintCell(gameId, x, y);
      await tx.wait();
      return tx;
    }
    console.warn('No session wallet — falling back to MetaMask for paintCell');
    const contract = await getMetaMaskContract();
    if (!contract) throw new Error('Wallet not connected');
    const tx = await contract.paintCell(gameId, x, y);
    await tx.wait();
    return tx;
  };

  // ── Read-only ─────────────────────────────────────────────────────────────────

  const getGameInfo = async (gameId) => {
    const contract = await getReadContract();
    if (!contract) return null;
    const info = await contract.getGameInfo(gameId);
    return {
      creator: info[0],
      players: [...info[1]],
      startTime: Number(info[2]),
      gameDuration: Number(info[3]),
      gridSize: Number(info[4]),
      maxPlayers: Number(info[5]),
      stakeAmount: info[6],
      totalStake: info[7],
      isActive: info[8],
      isFinished: info[9],
      winner: info[10],
    };
  };

  const getPaintTokens = async (gameId, playerAddress) => {
    const contract = await getReadContract();
    if (!contract) return 0;
    const tokens = await contract.getPaintTokens(gameId, playerAddress);
    return Number(tokens);
  };

  const getCellCount = async (gameId, playerAddress) => {
    const contract = await getReadContract();
    if (!contract) return 0;
    const count = await contract.getCellCount(gameId, playerAddress);
    return Number(count);
  };

  const getCellOwner = async (gameId, x, y) => {
    const contract = await getReadContract();
    if (!contract) return null;
    return await contract.getCellOwner(gameId, x, y);
  };

  return {
    createGame,
    joinGame,
    startGame,
    paintCell,
    endGame,
    registerSession,
    getGameInfo,
    getPaintTokens,
    getCellCount,
    getCellOwner,
  };
};
