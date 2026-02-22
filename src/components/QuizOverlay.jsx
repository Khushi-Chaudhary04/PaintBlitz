import { useState, useEffect } from 'react';
import { Brain, X, CheckCircle, XCircle } from 'lucide-react';

// MCQ questions — Monad-focused with some general web3
// Each question has a correct answer index (0-3) and 4 options
const QUESTIONS = [
  {
    q: "What is Monad's theoretical maximum throughput?",
    options: ["1,000 TPS", "10,000 TPS", "100,000 TPS", "500 TPS"],
    correct: 1,
  },
  {
    q: "What consensus mechanism does Monad use?",
    options: ["Nakamoto PoW", "MonadBFT (pBFT-based)", "Tendermint BFT", "Avalanche Snowball"],
    correct: 1,
  },
  {
    q: "What is Monad's approximate block time?",
    options: ["12 seconds", "2 seconds", "500 milliseconds", "5 seconds"],
    correct: 2,
  },
  {
    q: "What makes Monad's execution unique compared to standard EVMs?",
    options: ["It uses WASM instead of EVM", "It runs contracts in parallel", "It removes gas fees entirely", "It uses a DAG structure"],
    correct: 1,
  },
  {
    q: "What is Monad's single-slot finality time?",
    options: ["2 seconds", "12 seconds", "~1 second", "5 minutes"],
    correct: 2,
  },
  {
    q: "Which programming language are Monad smart contracts written in?",
    options: ["Rust", "Move", "Solidity", "Cairo"],
    correct: 2,
  },
  {
    q: "Monad is compatible with which existing ecosystem?",
    options: ["Solana", "Ethereum (EVM)", "Cosmos IBC", "Polkadot"],
    correct: 1,
  },
  {
    q: "What technique does Monad use to prepare execution before block finalization?",
    options: ["Sharding", "Optimistic rollups", "Pipelining", "ZK proofs"],
    correct: 2,
  },
  {
    q: "What is the native currency of Monad Testnet called?",
    options: ["ETH", "MATIC", "MON", "SOL"],
    correct: 2,
  },
  {
    q: "What does 'deferred execution' mean in Monad?",
    options: ["Transactions are batched to L2", "Execution happens after consensus", "Gas is deferred to the next block", "Smart contracts run off-chain"],
    correct: 1,
  },
  {
    q: "Which component of Monad handles high-performance state storage?",
    options: ["MonadDB", "LevelDB", "RocksDB", "EthereumTrie"],
    correct: 0,
  },
  {
    q: "What does EVM stand for?",
    options: ["Ethereum Value Mechanism", "Ethereum Virtual Machine", "Extended Validation Module", "Encrypted VM"],
    correct: 1,
  },
  {
    q: "What does Monad's pipelining separate?",
    options: ["Staking and unstaking", "Consensus, execution, and storage", "Signing and broadcasting", "Gas estimation and payment"],
    correct: 1,
  },
  {
    q: "What is Monad's approach to storage compared to Ethereum?",
    options: ["It uses IPFS for storage", "It has a custom high-performance DB (MonadDB)", "It outsources storage to Filecoin", "It mirrors Ethereum's MPT exactly"],
    correct: 1,
  },
  {
    q: "What does TPS stand for?",
    options: ["Token Per Stake", "Transactions Per Second", "Transfer Protocol System", "Timed Processing Speed"],
    correct: 1,
  },
  {
    q: "Monad achieves parallel execution by detecting what between transactions?",
    options: ["Gas price conflicts", "Nonce overlaps", "State access conflicts", "Signature duplicates"],
    correct: 2,
  },
  {
    q: "What does 'optimistic parallel execution' mean in Monad?",
    options: ["Transactions are always rolled back", "Txns run in parallel optimistically, re-run on conflicts", "All txns are queued and run in order", "Monad skips validation for speed"],
    correct: 1,
  },
  {
    q: "What is the Monad testnet chain ID (decimal)?",
    options: ["1", "137", "10143", "42161"],
    correct: 2,
  },
  {
    q: "What is a mempool?",
    options: ["A type of smart contract", "A pool of pending transactions", "A staking reward pool", "A cross-chain bridge"],
    correct: 1,
  },
  {
    q: "What does DeFi stand for?",
    options: ["Defined Finance", "Decentralized Finance", "Digital Financial Infrastructure", "Deferred Finance"],
    correct: 1,
  },
  {
    q: "What does 'MonadBFT' improve upon compared to standard pBFT?",
    options: ["It removes leader rotation", "It adds linear communication complexity", "It requires more validators", "It disables slashing"],
    correct: 1,
  },
  {
    q: "What is gas in the context of EVM chains?",
    options: ["A native token", "A fee for computation and storage", "A type of smart contract", "A consensus reward"],
    correct: 1,
  },
  {
    q: "What does MEV stand for?",
    options: ["Monad Execution Validator", "Maximal Extractable Value", "Multi-EVM Version", "Minimum Exchange Value"],
    correct: 1,
  },
  {
    q: "What type of node syncing does Monad optimize with pipelining?",
    options: ["Archive node syncing", "Light client syncing", "Full node syncing", "Validator onboarding"],
    correct: 2,
  },
  {
    q: "What does L1 mean in blockchain context?",
    options: ["Layer Two", "Level 1 Security", "Base Layer / Layer One", "Liquidity Layer"],
    correct: 2,
  },
  {
    q: "How does Monad handle EVM compatibility?",
    options: ["It reimplements EVM from scratch in Rust", "It uses a modified Geth client", "It runs a full EVM interpreter natively", "It transpiles Solidity to WASM"],
    correct: 0,
  },
  {
    q: "What does DAO stand for?",
    options: ["Data Access Object", "Decentralized Autonomous Organization", "Digital Asset Offering", "Distributed Application Operator"],
    correct: 1,
  },
  {
    q: "What is block finality?",
    options: ["The last transaction in a block", "When a block is irreversibly confirmed", "The maximum block size", "When a miner receives a reward"],
    correct: 1,
  },
  {
    q: "What does AMM stand for in DeFi?",
    options: ["Automated Money Manager", "Automated Market Maker", "Asset Management Module", "Algorithmic Mining Mechanism"],
    correct: 1,
  },
  {
    q: "What is the primary goal of Monad's architecture?",
    options: ["To replace Ethereum's consensus", "High-performance EVM-compatible L1", "To be a ZK rollup on Ethereum", "To eliminate smart contracts"],
    correct: 1,
  },
  {
    q: "What does ABI stand for in Solidity?",
    options: ["Application Binary Interface", "Account Balance Index", "Asset Bridge Interface", "Automated Block Instruction"],
    correct: 0,
  },
  {
    q: "What does RPC stand for?",
    options: ["Remote Procedure Call", "Registered Protocol Chain", "Routing Protocol Contract", "Real-time Processing Core"],
    correct: 0,
  },
  {
    q: "What does TVL stand for in DeFi?",
    options: ["Token Value Locked", "Total Volume Limit", "Total Value Locked", "Transaction Validation Layer"],
    correct: 2,
  },
  {
    q: "What is a validator's role in a PoS network?",
    options: ["Mine new blocks via PoW", "Validate and attest to new blocks", "Store NFT metadata", "Bridge tokens between chains"],
    correct: 1,
  },
  {
    q: "What is a nonce in Ethereum?",
    options: ["A random salt for hashing", "A transaction counter per account", "The block timestamp", "A validator ID"],
    correct: 1,
  },
  {
    q: "What does DEX stand for?",
    options: ["Digital Exchange", "Decentralized Exchange", "Data Execution Layer", "Delegated EVM Extension"],
    correct: 1,
  },
  {
    q: "What does BFT stand for?",
    options: ["Block Finalization Time", "Byzantine Fault Tolerance", "Base Fee Threshold", "Bridged Finance Token"],
    correct: 1,
  },
  {
    q: "What is slippage in a DEX trade?",
    options: ["A failed transaction", "Price difference between expected and executed price", "A type of front-running", "A gas price spike"],
    correct: 1,
  },
  {
    q: "What is Monad's approach to developer onboarding?",
    options: ["Developers must learn a new language", "Full EVM/Solidity compatibility — existing tools work", "Only Rust-based SDKs are supported", "Requires a special Monad compiler"],
    correct: 1,
  },
  {
    q: "What does zkEVM stand for?",
    options: ["Zero-Key EVM", "Zero-Knowledge Ethereum Virtual Machine", "Zoned Knowledge EVM", "Zero-Cost Execution Model"],
    correct: 1,
  },
  {
    q: "What is a liquidity pool?",
    options: ["A pool of validator nodes", "A reserve of tokens enabling DEX trading", "A multi-sig wallet", "A cross-chain bridge contract"],
    correct: 1,
  },
  {
    q: "What does EOA stand for in Ethereum?",
    options: ["Externally Owned Account", "Encrypted On-chain Asset", "Event-Ordered Action", "Execution Optimization Agent"],
    correct: 0,
  },
  {
    q: "What does NFT stand for?",
    options: ["New Finance Token", "Non-Fungible Token", "Network Fee Transaction", "Node Fingerprint Type"],
    correct: 1,
  },
  {
    q: "What is staking in crypto?",
    options: ["Sending tokens to burn address", "Locking tokens to support network security and earn rewards", "Trading tokens on a DEX", "Bridging tokens to another chain"],
    correct: 1,
  },
  {
    q: "What is a crypto bridge?",
    options: ["A DEX aggregator", "A protocol enabling asset transfers between chains", "A validator client", "A block explorer tool"],
    correct: 1,
  },
  {
    q: "What does EIP stand for?",
    options: ["Ethereum Integration Protocol", "Ethereum Improvement Proposal", "Encrypted Interop Protocol", "EVM Instruction Package"],
    correct: 1,
  },
  {
    q: "What is a rollup in blockchain?",
    options: ["A type of PoW algorithm", "A Layer 2 scaling solution that posts data to L1", "A validator set rotation", "A new EVM opcode"],
    correct: 1,
  },
  {
    q: "What does P2P stand for?",
    options: ["Protocol to Protocol", "Peer to Peer", "Pay to Play", "Proof to Produce"],
    correct: 1,
  },
  {
    q: "What is the purpose of Monad's shared mempool?",
    options: ["To store NFT metadata", "To allow validators to see and order transactions efficiently", "To bridge assets between Monad and Ethereum", "To replace the EVM with WASM"],
    correct: 1,
  },
  {
    q: "What does PoS stand for?",
    options: ["Proof of Speed", "Proof of Stake", "Protocol of Sync", "Point of Sale"],
    correct: 1,
  },
];

export const QuizOverlay = ({ cellX, cellY, onCorrectAnswer, onClose }) => {
  // Same cell always gets same question
  const questionIndex = ((cellX + cellY) * 7) % QUESTIONS.length;
  const { q: question, options, correct } = QUESTIONS[questionIndex];

  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong' | null
  const [shake, setShake] = useState(false);

  const handleSelect = (idx) => {
    if (status === 'correct') return;
    setSelected(idx);
    if (idx === correct) {
      setStatus('correct');
      setTimeout(() => onCorrectAnswer(), 700);
    } else {
      setStatus('wrong');
      setShake(true);
      setTimeout(() => {
        setStatus(null);
        setSelected(null);
        setShake(false);
      }, 1200);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const getOptionStyle = (idx) => {
    const base = "w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center gap-3 ";
    if (status === 'correct' && idx === correct) {
      return base + "border-green-500 bg-green-500/20 text-green-300";
    }
    if (status === 'wrong' && idx === selected) {
      return base + "border-red-500 bg-red-500/20 text-red-300";
    }
    if (selected === idx) {
      return base + "border-cyan-500 bg-cyan-500/10 text-white";
    }
    return base + "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-cyan-500/60 hover:bg-cyan-900/20 hover:text-white";
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br from-purple-900 to-cyan-900 border-2 border-cyan-500 rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/50 ${shake ? 'animate-shake' : ''}`}>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Answer to Paint!</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-5">
          Cell ({cellX}, {cellY}) · Pick the correct answer to claim it
        </p>

        <div className="bg-black/50 rounded-xl px-6 py-5 mb-6">
          <p className="text-lg font-bold text-center text-cyan-300 leading-relaxed">
            {question}
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={getOptionStyle(idx)}
              disabled={status === 'correct'}
            >
              <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                status === 'correct' && idx === correct ? 'bg-green-500 text-white' :
                status === 'wrong' && idx === selected ? 'bg-red-500 text-white' :
                'bg-gray-800 text-gray-400'
              }`}>
                {status === 'correct' && idx === correct ? <CheckCircle className="w-4 h-4" /> :
                 status === 'wrong' && idx === selected ? <XCircle className="w-4 h-4" /> :
                 optionLabels[idx]}
              </span>
              <span>{opt}</span>
            </button>
          ))}
        </div>

        {status === 'correct' && (
          <p className="text-center text-green-400 font-bold mt-5 text-sm animate-pulse">
            ✅ Correct! Painting your cell...
          </p>
        )}
        {status === 'wrong' && (
          <p className="text-center text-red-400 font-bold mt-5 text-sm">
            ❌ Wrong! Try again.
          </p>
        )}

        <p className="text-center text-gray-600 text-xs mt-4">
          Press Esc to cancel
        </p>
      </div>
    </div>
  );
};
