import { useState, useEffect, useCallback, useRef } from 'react';
import { JsonRpcProvider, WebSocketProvider, Contract, Interface } from 'ethers';
import { GameCanvas } from './GameCanvas';
import { Scoreboard } from './Scoreboard';
import { Timer } from './Timer';
import { QuizOverlay } from './QuizOverlay';
import { ArrowLeft, Trophy, Copy, Check, Play } from 'lucide-react';
import { PLAYER_COLORS, MONAD_CONFIG, CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const RECONCILE_INTERVAL = 30000; // 30s — full sync backup (reduced from 20s to cut RPC load)
const POLL_INTERVAL = 8000;       // 8s — game state poll (slowed from 5s to reduce 429s)
const WS_RPC_URL = 'wss://testnet-rpc.monad.xyz';
const HTTP_RPC_URL = MONAD_CONFIG.rpcUrls[0];

// Dedicated read-only HTTP provider for game state / reconcile
const readProvider = new JsonRpcProvider(HTTP_RPC_URL);
const readContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
const iface = new Interface(CONTRACT_ABI);
const CELL_PAINTED_TOPIC = iface.getEvent('CellPainted').topicHash;

export const GameView = ({ gameId, account, contract, onExit }) => {
  const [gameInfo, setGameInfo] = useState(null);
  const [grid, setGrid] = useState([]);
  const [paintTokens, setPaintTokens] = useState(0);
  const [cellCounts, setCellCounts] = useState({});
  const [pendingCell, setPendingCell] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting' | 'live' | 'polling'

  const pendingCellsRef = useRef(new Set());
  const gameInfoRef = useRef(null);
  const lastEventBlockRef = useRef(0);
  const reconcileInProgressRef = useRef(false);
  const prizePoolRef = useRef(0);
  const wsProviderRef = useRef(null);
  const wsRetryTimerRef = useRef(null);
  const wsRetryCountRef = useRef(0);
  const fallbackIntervalRef = useRef(null);

  useEffect(() => { gameInfoRef.current = gameInfo; }, [gameInfo]);

  const myPlayerIndex = gameInfo?.players?.findIndex(
    p => p?.toLowerCase() === account?.toLowerCase()
  ) ?? -1;
  const myColorIndex = myPlayerIndex >= 0 ? myPlayerIndex + 1 : 1;

  const createEmptyGrid = (size) =>
    Array(size).fill(null).map(() => Array(size).fill(0));

  const applyGridCell = (prevGrid, x, y, colorIdx) => {
    const next = prevGrid.map(row => [...row]);
    if (next[x]) next[x][y] = colorIdx;
    return next;
  };

  // ── Handle a single CellPainted log (shared by WS and polling paths) ──────────
  const applyPaintLog = useCallback((log) => {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed) return;
      const { gameId: logGameId, player, x, y } = parsed.args;
      if (Number(logGameId) !== gameId) return;
      const addr = player.toLowerCase();
      const info = gameInfoRef.current;
      const idx = info?.players?.findIndex(p => p.toLowerCase() === addr) ?? -1;
      if (idx >= 0) {
        setGrid(prev => applyGridCell(prev, Number(x), Number(y), idx + 1));
      }
    } catch (_) {}
  }, [gameId]);

  // ── WebSocket subscription ────────────────────────────────────────────────────
  const startWsSubscription = useCallback(() => {
    // Don't start if game isn't active yet
    if (!gameInfoRef.current?.isActive) return;

    // Tear down any existing WS
    const old = wsProviderRef.current;
    if (old) {
      try { old.removeAllListeners(); old.destroy?.(); } catch (_) {}
      wsProviderRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    setWsStatus('connecting');

    let ws;
    try {
      ws = new WebSocketProvider(WS_RPC_URL);
    } catch (e) {
      console.warn('WebSocketProvider unavailable, falling back to polling:', e.message);
      startEventPollingFallback();
      return;
    }

    wsProviderRef.current = ws;

    const filter = {
      address: CONTRACT_ADDRESS,
      topics: [CELL_PAINTED_TOPIC],
    };

    // Listen for CellPainted events
    ws.on(filter, (log) => {
      applyPaintLog(log);
    });

    // Ethers v6 WebSocketProvider exposes the raw WebSocket as ws.websocket
    // Use its open/close/error events to track connection state
    const rawWs = ws.websocket;
    if (rawWs) {
      const onOpen = () => {
        setWsStatus('live');
        wsRetryCountRef.current = 0;
        console.log('WebSocket connected — real-time events active');
      };
      const onClose = () => handleWsError();
      const onError = () => handleWsError();

      // readyState 1 = OPEN (already connected synchronously in some environments)
      if (rawWs.readyState === 1) {
        onOpen();
      } else {
        rawWs.addEventListener('open', onOpen, { once: true });
      }
      rawWs.addEventListener('close', onClose, { once: true });
      rawWs.addEventListener('error', onError, { once: true });
    } else {
      // No raw WS handle — assume connected (ethers may buffer internally)
      setWsStatus('live');
      wsRetryCountRef.current = 0;
    }
  }, [applyPaintLog]);

  const handleWsError = useCallback(() => {
    const ws = wsProviderRef.current;
    if (ws) {
      try { ws.removeAllListeners(); ws.destroy?.(); } catch (_) {}
      wsProviderRef.current = null;
    }
    setWsStatus('polling');

    wsRetryCountRef.current += 1;
    const delay = Math.min(5000 * wsRetryCountRef.current, 30000); // cap at 30s
    console.warn(`WS disconnected — retrying in ${delay / 1000}s (attempt ${wsRetryCountRef.current})`);

    // Fall back to event polling while reconnecting
    startEventPollingFallback();

    wsRetryTimerRef.current = setTimeout(() => {
      if (gameInfoRef.current?.isActive) {
        startWsSubscription();
      }
    }, delay);
  }, [startWsSubscription]);

  // Fallback: poll getLogs (only used when WS is down)
  const startEventPollingFallback = useCallback(() => {
    if (fallbackIntervalRef.current) return; // already running
    const poll = async () => {
      const info = gameInfoRef.current;
      if (!info?.isActive) return;
      try {
        const latestBlock = await readProvider.getBlockNumber();
        const fromBlock = lastEventBlockRef.current > 0
          ? lastEventBlockRef.current + 1
          : Math.max(0, latestBlock - 50);
        if (fromBlock > latestBlock) return;
        const logs = await readProvider.getLogs({
          address: CONTRACT_ADDRESS,
          topics: [CELL_PAINTED_TOPIC],
          fromBlock,
          toBlock: latestBlock,
        });
        lastEventBlockRef.current = latestBlock;
        logs.forEach(applyPaintLog);
      } catch (e) {
        // silently ignore — rate limit or network issue
      }
    };
    poll(); // immediate first call
    fallbackIntervalRef.current = setInterval(poll, 3000); // 3s fallback (slower = fewer 429s)
  }, [applyPaintLog]);

  // ── Full grid reconcile — runs every 30s ─────────────────────────────────────
  const reconcileGrid = useCallback(async () => {
    const info = gameInfoRef.current;
    if (!info?.isActive || !info?.gridSize || !info?.players?.length) return;
    if (reconcileInProgressRef.current) return;
    reconcileInProgressRef.current = true;
    try {
      const { gridSize, players } = info;
      // Fetch all cells with a small stagger to avoid bursting the RPC
      const results = [];
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          results.push(
            readContract.getCellOwner(gameId, x, y)
              .then(owner => ({ x, y, owner, ok: true }))
              .catch(() => ({ x, y, owner: null, ok: false }))
          );
          // Tiny stagger — 10 calls per batch then wait 100ms to avoid 429s
          if (results.length % 10 === 0) await new Promise(r => setTimeout(r, 100));
        }
      }
      const settled = await Promise.all(results);

      setGrid(prev => {
        if (!prev?.length) return prev;
        const next = prev.map(row => [...row]);
        settled.forEach(({ x, y, owner, ok }) => {
          if (!ok) return;
          if (pendingCellsRef.current.has(`${x}:${y}`)) return;
          if (!owner || owner.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
            next[x][y] = 0;
          } else {
            const idx = players.findIndex(p => p.toLowerCase() === owner.toLowerCase());
            if (idx >= 0) next[x][y] = idx + 1;
          }
        });
        return next;
      });
    } catch (e) {
      // silently ignore
    } finally {
      reconcileInProgressRef.current = false;
    }
  }, [gameId]);

  // ── Optimistic paint ──────────────────────────────────────────────────────────
  const optimisticPaint = useCallback(async (x, y) => {
    const info = gameInfoRef.current;
    if (!info?.isActive || !account) return;
    const key = `${x}:${y}`;

    pendingCellsRef.current.add(key);
    setGrid(prev => applyGridCell(prev, x, y, myColorIndex));
    setPaintTokens(prev => Math.max(0, prev - 1));
    setCellCounts(prev => ({
      ...prev,
      [account.toLowerCase()]: (prev[account.toLowerCase()] || 0) + 1,
    }));

    try {
      await contract.paintCell(gameId, x, y);
    } catch (error) {
      const msg = error?.reason || error?.message || '';
      console.error('paintCell error:', msg);
      setGrid(prev => applyGridCell(prev, x, y, 0));
      setPaintTokens(prev => prev + 1);
      setCellCounts(prev => ({
        ...prev,
        [account.toLowerCase()]: Math.max(0, (prev[account.toLowerCase()] || 1) - 1),
      }));
    } finally {
      pendingCellsRef.current.delete(key);
    }
  }, [contract, gameId, account, myColorIndex]);

  // ── Poll game state (slower, just for status/tokens/counts) ──────────────────
  const pollGameData = useCallback(async () => {
    try {
      const raw = await readContract.getGameInfo(gameId);
      const info = {
        creator: raw[0],
        players: [...raw[1]],
        startTime: Number(raw[2]),
        gameDuration: Number(raw[3]),
        gridSize: Number(raw[4]),
        maxPlayers: Number(raw[5]),
        stakeAmount: raw[6],
        totalStake: raw[7],
        isActive: raw[8],
        isFinished: raw[9],
        winner: raw[10],
      };

      const wasActive = gameInfoRef.current?.isActive;
      setGameInfo(info);
      if (info.isFinished) { setGameEnded(true); setWinner(info.winner); }
      if (Number(info.totalStake) > 0) prizePoolRef.current = Number(info.totalStake);

      // Start WS once game becomes active
      if (!wasActive && info.isActive) {
        startWsSubscription();
      }

      if (account && info.isActive) {
        if (pendingCellsRef.current.size === 0) {
          try {
            const tokens = await readContract.getPaintTokens(gameId, account);
            setPaintTokens(Number(tokens));
          } catch (_) {}
        }
        if (info.players?.length > 0) {
          try {
            const counts = {};
            // Sequential (not parallel) to avoid bursting RPC
            for (const player of info.players) {
              const count = await readContract.getCellCount(gameId, player);
              counts[player.toLowerCase()] = Number(count);
            }
            setCellCounts(prev => {
              if (pendingCellsRef.current.size === 0) return counts;
              return {
                ...counts,
                [account.toLowerCase()]: Math.max(
                  counts[account.toLowerCase()] || 0,
                  prev[account.toLowerCase()] || 0
                ),
              };
            });
          } catch (_) {}
        }
      }
    } catch (error) {
      console.warn('Poll warning:', error.message?.slice(0, 80));
    }
  }, [gameId, account, startWsSubscription]);

  // ── Setup polling + WS lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    pollGameData();

    const pollInterval = setInterval(pollGameData, POLL_INTERVAL);
    const reconcileInterval = setInterval(reconcileGrid, RECONCILE_INTERVAL);

    return () => {
      clearInterval(pollInterval);
      clearInterval(reconcileInterval);
      // Clean up WS
      if (wsRetryTimerRef.current) clearTimeout(wsRetryTimerRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
      const ws = wsProviderRef.current;
      if (ws) {
        try { ws.removeAllListeners(); ws.destroy?.(); } catch (_) {}
      }
    };
  }, [gameId, account]);

  // Init grid when game becomes active; start WS if already active on mount
  useEffect(() => {
    if (gameInfo?.gridSize && grid.length === 0) {
      setGrid(createEmptyGrid(gameInfo.gridSize));
    }
    if (gameInfo?.isActive && gameInfo?.gridSize && gameInfo?.players?.length > 0) {
      if (grid.length === 0) reconcileGrid();
      // Kick off WS if not already running
      if (!wsProviderRef.current && wsStatus === 'connecting') {
        startWsSubscription();
      }
    }
  }, [gameInfo?.isActive, gameInfo?.gridSize]);

  const handleCellClick = useCallback((x, y) => {
    const info = gameInfoRef.current;
    if (!info?.isActive || gameEnded) return;
    if (paintTokens <= 0) { alert('No paint tokens left!'); return; }
    if (grid[x]?.[y] !== 0) return;
    setPendingCell({ x, y });
  }, [paintTokens, grid, gameEnded]);

  const handleCorrectAnswer = useCallback(() => {
    if (!pendingCell) return;
    const { x, y } = pendingCell;
    setPendingCell(null);
    optimisticPaint(x, y);
  }, [pendingCell, optimisticPaint]);

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      await contract.startGame(gameId);
      await pollGameData();
    } catch (e) {
      alert(e.reason || e.message || 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleTimeUp = useCallback(async () => {
    setIsFinalizing(true);
    try {
      await contract.endGame(gameId);
      await pollGameData();
    } catch (e) {
      if (e.reason !== 'Still running') {
        console.error('endGame error:', e.reason || e.message);
      }
    } finally {
      setIsFinalizing(false);
    }
  }, [contract, gameId, pollGameData]);

  const copyGameId = () => {
    navigator.clipboard.writeText(String(gameId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasPendingTxs = pendingCellsRef.current.size > 0;

  if (!gameInfo) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading game #{gameId}...</p>
        </div>
      </div>
    );
  }

  const stakeETH = (Number(gameInfo.stakeAmount) / 1e18).toFixed(4);
  const isCreator = gameInfo.creator?.toLowerCase() === account?.toLowerCase();

  // ── Lobby ─────────────────────────────────────────────────────────────────────
  if (!gameInfo.isActive && !gameInfo.isFinished) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Game Lobby</h1>
            <button onClick={onExit} className="text-gray-500 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-cyan-500/30 mb-6">
            <p className="text-gray-400 text-sm mb-1">Game ID — share with friends</p>
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-mono text-2xl font-bold">{gameId}</span>
              <button onClick={copyGameId} className="text-gray-500 hover:text-white transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-400 font-bold">{gameInfo.gridSize}×{gameInfo.gridSize}</div>
              <div className="text-gray-500">Grid</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-cyan-500/20">
              <div className="text-cyan-400 font-bold">{gameInfo.gameDuration}s</div>
              <div className="text-gray-500">Duration</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-pink-500/20">
              <div className="text-pink-400 font-bold">{gameInfo.players.length}/{gameInfo.maxPlayers}</div>
              <div className="text-gray-500">Players</div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {gameInfo.players.map((player, idx) => (
              <div key={player} className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx + 1] }} />
                <span className="text-white font-mono text-sm">
                  {player.toLowerCase() === account?.toLowerCase() ? 'You ✓' : `Player ${idx + 1}`}
                </span>
                <span className="text-gray-500 font-mono text-xs ml-auto">
                  {player.slice(0, 6)}...{player.slice(-4)}
                </span>
              </div>
            ))}
            {Array(gameInfo.maxPlayers - gameInfo.players.length).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900/20 rounded-lg p-3 border border-dashed border-gray-800">
                <div className="w-4 h-4 rounded-full bg-gray-700" />
                <span className="text-gray-600 text-sm">Waiting for player...</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3 mb-6 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Stake per player</span>
              <span className="text-yellow-400 font-bold">{stakeETH} MON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Prize pool</span>
              <span className="text-green-400 font-bold">{(Number(gameInfo.totalStake) / 1e18).toFixed(3)} MON</span>
            </div>
          </div>

          {isCreator ? (
            gameInfo.players.length >= 2 ? (
              <button onClick={handleStartGame} disabled={isStarting}
                className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-green-500/50">
                <Play className="w-5 h-5" />
                {isStarting ? 'Starting...' : `Start Game (${gameInfo.players.length} players ready)`}
              </button>
            ) : (
              <p className="text-gray-500 text-sm text-center">Need at least 2 players to start</p>
            )
          ) : (
            <p className="text-gray-400 text-sm text-center animate-pulse">Waiting for creator to start...</p>
          )}

          <button onClick={onExit} className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-3 px-6 rounded-xl transition-all">
            Leave Lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Active/Finished Game ──────────────────────────────────────────────────────
  // WS status indicator colors
  const wsIndicator = wsStatus === 'live'
    ? { color: 'bg-green-400', label: 'live' }
    : wsStatus === 'polling'
    ? { color: 'bg-yellow-400 animate-pulse', label: 'polling' }
    : { color: 'bg-gray-500 animate-pulse', label: 'connecting' };

  return (
    <div className="min-h-screen bg-[#080810] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Exit Game
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${hasPendingTxs ? 'bg-yellow-400 animate-pulse' : wsIndicator.color}`} />
              {hasPendingTxs ? 'syncing...' : wsIndicator.label}
            </span>
            <span className="text-gray-400">
              Game <span className="text-cyan-400 font-mono">{gameId}</span>
              {' · '}{gameInfo.gridSize}×{gameInfo.gridSize}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameCanvas grid={grid} gridSize={gameInfo.gridSize} onCellClick={handleCellClick} />
            {isFinalizing && (
              <p className="text-center text-yellow-400 text-sm mt-2 animate-pulse">⏳ Finalizing game on-chain...</p>
            )}
          </div>

          <div className="space-y-4">
            <Timer startTime={gameInfo.startTime} gameDuration={gameInfo.gameDuration} onTimeUp={handleTimeUp} />

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-5">
              <h3 className="text-sm text-gray-400 mb-1">🎨 Paint Tokens</h3>
              <div className="text-4xl font-bold text-purple-400">{paintTokens}</div>
              <p className="text-gray-500 text-xs mt-1">Answer correctly to paint a cell</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-yellow-400 mb-3">💰 Prize Pool</h3>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Stake per player</span>
                <span className="text-yellow-400 font-mono">{stakeETH} MON</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total pot</span>
                <span className="text-green-400 font-bold text-xl">{((gameEnded ? prizePoolRef.current : Number(gameInfo.totalStake)) / 1e18).toFixed(4)} MON</span>
              </div>
              {gameEnded && winner && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <span className="text-green-400 font-bold text-sm">✅ Paid out!</span>
                  <p className="text-xs text-gray-500 mt-1 font-mono">To: {winner.slice(0, 6)}...{winner.slice(-4)}</p>
                </div>
              )}
            </div>

            <Scoreboard players={gameInfo.players} scores={cellCounts} currentPlayer={account} />
          </div>
        </div>
      </div>

      {pendingCell && (
        <QuizOverlay
          cellX={pendingCell.x}
          cellY={pendingCell.y}
          onCorrectAnswer={handleCorrectAnswer}
          onClose={() => setPendingCell(null)}
        />
      )}

      {gameEnded && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-cyan-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl shadow-yellow-500/50">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
            {winner && account && winner.toLowerCase() === account.toLowerCase() ? (
              <div>
                <p className="text-2xl text-yellow-400 font-bold mb-2">🎉 YOU WON!</p>
                <p className="text-gray-300 mb-4">Prize Pool: {(prizePoolRef.current / 1e18).toFixed(4)} MON sent to your wallet</p>
              </div>
            ) : (
              <p className="text-xl text-gray-300 mb-4">
                Winner: {winner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : 'No winner'}
              </p>
            )}
            <div className="space-y-2 mb-6">
              {gameInfo.players.map((player, idx) => (
                <div key={player} className="flex justify-between items-center bg-black/30 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx + 1] }} />
                    <span className="text-white text-sm">
                      {player.toLowerCase() === account?.toLowerCase() ? 'You' : `Player ${idx + 1}`}
                    </span>
                  </div>
                  <span className="text-cyan-400 font-bold">{cellCounts[player.toLowerCase()] || 0} cells</span>
                </div>
              ))}
            </div>
            <button onClick={onExit} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl">
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};