import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameView } from './components/GameView';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import { useSessionWallet } from './hooks/useSessionWallet';
import { EXPECTED_CHAIN_ID, MONAD_CONFIG } from './constants';

function App() {
  const { account, provider, chainId, isConnecting, connectWallet } = useWallet();
  const {
    sessionAddress,
    isReady: sessionReady,
    isFunding,
    fundSession,
    ensureFunded,
    getSessionSigner,
    drainSession,
  } = useSessionWallet(provider);

  const contract = useContract(provider, getSessionSigner, ensureFunded);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isWrongNetwork = provider != null && chainId != null && chainId !== EXPECTED_CHAIN_ID;

  const checkNetwork = () => {
    if (isWrongNetwork) {
      alert(`Wrong network. Switch to ${MONAD_CONFIG.chainName} in MetaMask.`);
      return false;
    }
    return true;
  };

  const setupSession = async (gameId: number) => {
    if (!sessionAddress) return;
    try {
      await fundSession();
      await contract.registerSession(gameId, sessionAddress);
    } catch (e) {
      console.error('Session setup error:', e);
    }
  };

  const handleCreateGame = async (
    gridSize: number,
    gameDuration: number,
    maxPlayers: number,
    stakeAmount: string
  ) => {
    if (!provider) { alert('Connect wallet first'); return; }
    if (!checkNetwork()) return;
    setIsLoading(true);
    try {
      const gameId = await contract.createGame(gridSize, gameDuration, maxPlayers, stakeAmount);
      if (gameId == null) throw new Error('Could not get game ID');
      await setupSession(gameId);
      setCurrentGameId(gameId);
    } catch (error) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (gameId: number) => {
    if (!provider) { alert('Connect wallet first'); return; }
    if (!checkNetwork()) return;
    setIsLoading(true);
    try {
      await contract.joinGame(gameId);
      await setupSession(gameId);
      setCurrentGameId(gameId);
    } catch (error: unknown) {
      console.error('Error joining game:', error);
      alert(error instanceof Error ? error.message : 'Failed to join game.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitGame = async () => {
    await drainSession();
    setCurrentGameId(null);
  };

  if (currentGameId !== null) {
    return (
      <GameView
        gameId={currentGameId}
        account={account}
        contract={contract}
        onExit={handleExitGame}
      />
    );
  }

  return (
    <LandingPage
      account={account}
      onConnect={connectWallet}
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
      isConnecting={isConnecting}
      isLoading={isLoading || isFunding}
    />
  );
}

export default App;
