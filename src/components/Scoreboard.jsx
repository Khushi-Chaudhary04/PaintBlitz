import { Trophy } from 'lucide-react';
import { PLAYER_COLORS } from '../constants';

export const Scoreboard = ({ players, scores, currentPlayer }) => {
  const sortedPlayers = [...players].sort((a, b) =>
    (scores[b.toLowerCase()] || 0) - (scores[a.toLowerCase()] || 0)
  );

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, rank) => {
          const cells = scores[player.toLowerCase()] || 0;
          const isMe = player.toLowerCase() === currentPlayer?.toLowerCase();
          const colorIndex = players.indexOf(player) + 1;

          return (
            <div
              key={player}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isMe
                  ? 'bg-cyan-500/20 border-2 border-cyan-500'
                  : 'bg-gray-900/50 border border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-4">{rank + 1}</span>
                {rank === 0 && cells > 0 && <Trophy className="w-4 h-4 text-yellow-400 absolute ml-4" />}
                <div
                  className="w-6 h-6 rounded-full border-2 flex-shrink-0"
                  style={{
                    backgroundColor: PLAYER_COLORS[colorIndex],
                    borderColor: PLAYER_COLORS[colorIndex],
                    boxShadow: `0 0 8px ${PLAYER_COLORS[colorIndex]}80`,
                  }}
                />
                <div>
                  <p className="text-white text-sm font-medium">
                    {isMe ? 'You' : `Player ${players.indexOf(player) + 1}`}
                  </p>
                  <p className="text-gray-500 text-xs font-mono">
                    {player.slice(0, 6)}...{player.slice(-4)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-cyan-400">{cells}</p>
                <p className="text-gray-500 text-xs">cells</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
