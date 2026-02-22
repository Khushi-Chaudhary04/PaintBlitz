import { useState } from 'react';
import { Wallet, Gamepad2, Users, ChevronRight } from 'lucide-react';

export const LandingPage = ({ account, onConnect, onCreateGame, onJoinGame, isConnecting, isLoading }) => {
  const [mode, setMode] = useState(null);
  const [gameId, setGameId] = useState('');
  const [gridSize, setGridSize] = useState(5);
  const [gameDuration, setGameDuration] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [stakeAmount, setStakeAmount] = useState('0.001');
  const [customStake, setCustomStake] = useState(false);

  const PRESET_STAKES = ['0.001', '0.005', '0.01', '0.1'];

  const handleCreate = () => {
    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 0.001) { alert('Minimum stake is 0.001 MON'); return; }
    if (stake > 1) { alert('Maximum stake is 1 MON'); return; }
    onCreateGame(gridSize, gameDuration, maxPlayers, stakeAmount);
  };

  const handleJoin = () => {
    if (gameId.trim()) onJoinGame(parseInt(gameId.trim()));
  };

  const tokensPerPlayer = Math.floor((gridSize * gridSize) / maxPlayers);
  const prizePool = (maxPlayers * parseFloat(stakeAmount || 0)).toFixed(3);

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">

        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <Gamepad2 className="w-16 h-16 text-purple-500" />
          </div>
          <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-transparent bg-clip-text">
            PIXEL WAR
          </h1>
          <p className="text-gray-400 text-lg">High-Performance On-Chain Multiplayer Battle</p>
          <p className="text-cyan-400 text-sm mt-1">Powered by Monad • Answer to Paint • Winner Takes All</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm">

          {!account ? (
            <div className="space-y-4">
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
              >
                <Wallet className="w-6 h-6" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              <p className="text-center text-gray-500 text-sm">Connects to Monad Testnet automatically</p>
            </div>

          ) : mode === null ? (
            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-cyan-500/30 mb-6">
                <p className="text-gray-400 text-sm mb-1">Connected Wallet</p>
                <p className="text-cyan-400 font-mono text-sm">{account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>
              <button
                onClick={() => setMode('create')}
                className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-green-500/50"
              >
                <Gamepad2 className="w-6 h-6" />
                Create Game
                <ChevronRight className="w-5 h-5 ml-auto" />
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#080810] text-gray-500">OR</span>
                </div>
              </div>
              <button
                onClick={() => setMode('join')}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
              >
                <Users className="w-6 h-6" />
                Join Game
                <ChevronRight className="w-5 h-5 ml-auto" />
              </button>
            </div>

          ) : mode === 'create' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white text-sm">← Back</button>
                <h2 className="text-xl font-bold text-white">Configure Your Game</h2>
              </div>

              {/* Grid Size */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Grid Size</label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 8, 10].map(size => (
                    <button key={size} onClick={() => setGridSize(size)}
                      className={`py-3 rounded-xl font-bold text-lg transition-all border-2 ${gridSize === size ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'}`}>
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Game Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ val: 60, label: '1 min' }, { val: 180, label: '3 min' }, { val: 300, label: '5 min' }].map(opt => (
                    <button key={opt.val} onClick={() => setGameDuration(opt.val)}
                      className={`py-3 rounded-xl font-bold transition-all border-2 ${gameDuration === opt.val ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Players */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Max Players</label>
                <div className="grid grid-cols-4 gap-3">
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setMaxPlayers(n)}
                      className={`py-3 rounded-xl font-bold text-lg transition-all border-2 ${maxPlayers === n ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Amount */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Stake per Player (MON)</label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {PRESET_STAKES.map(amt => (
                    <button key={amt} onClick={() => { setStakeAmount(amt); setCustomStake(false); }}
                      className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${stakeAmount === amt && !customStake ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500'}`}>
                      {amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={customStake ? stakeAmount : ''}
                    onChange={e => { setStakeAmount(e.target.value); setCustomStake(true); }}
                    onFocus={() => setCustomStake(true)}
                    placeholder="Custom amount..."
                    className={`w-full bg-gray-900 rounded-xl px-4 py-3 text-white text-center font-mono focus:outline-none transition-all border-2 ${customStake ? 'border-yellow-500' : 'border-gray-700 focus:border-yellow-500'}`}
                    step="0.001" min="0.001" max="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">MON</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-700 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total cells</span>
                  <span className="text-white font-mono">{gridSize * gridSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Paint tokens per player</span>
                  <span className="text-cyan-400 font-mono font-bold">{tokensPerPlayer}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Stake per player</span>
                  <span className="text-yellow-400 font-mono font-bold">{stakeAmount} MON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prize pool</span>
                  <span className="text-green-400 font-mono font-bold text-lg">{prizePool} MON</span>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/50"
              >
                <Gamepad2 className="w-6 h-6" />
                {isLoading ? 'Setting up...' : `Create Game & Stake ${stakeAmount} MON`}
              </button>
            </div>

          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setMode(null)} className="text-gray-500 hover:text-white text-sm">← Back</button>
                <h2 className="text-xl font-bold text-white">Join a Game</h2>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-cyan-500/30">
                <p className="text-gray-400 text-sm mb-1">Connected Wallet</p>
                <p className="text-cyan-400 font-mono text-sm">{account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>
              <div className="space-y-3">
                <label className="text-gray-400 text-sm block">Game ID (get from your friend)</label>
                <input
                  type="number"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  className="w-full bg-gray-900 border border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 text-center text-2xl font-mono"
                />
              </div>
              <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-700 text-sm">
                <p className="text-gray-400 text-xs mb-2">Stake is set by the game creator — you'll see the exact amount in MetaMask before confirming.</p>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas wallet setup</span>
                  <span className="text-cyan-400 font-mono">~0.01 MON (one time)</span>
                </div>
              </div>
              <button
                onClick={handleJoin}
                disabled={!gameId.trim() || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
              >
                <Users className="w-6 h-6" />
                {isLoading ? 'Setting up...' : 'Join Game'}
              </button>
            </div>
          )}
        </div>

        {!account && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">5×5→10×10</div>
              <div className="text-gray-500 text-sm">Grid Size</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/20">
              <div className="text-2xl font-bold text-cyan-400">1-5 min</div>
              <div className="text-gray-500 text-sm">Game Time</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">2-5</div>
              <div className="text-gray-500 text-sm">Players</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
