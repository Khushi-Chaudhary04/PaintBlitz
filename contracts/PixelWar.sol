// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PixelWar {

    struct Game {
        address creator;
        address[] players;
        uint256 startTime;
        uint256 gameDuration;
        uint256 gridSize;
        uint256 maxPlayers;
        uint256 stakeAmount;
        uint256 totalStake;
        bool started;
        bool finished;
        address winner;
    }

    uint256 public gameCounter;
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => uint256)) public paintTokens;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public cellOwner;
    mapping(uint256 => mapping(address => uint256)) public cellCount;

    // Session wallet delegation — burner signs paintCell on behalf of real player
    mapping(uint256 => mapping(address => address)) public sessionDelegate;
    mapping(uint256 => mapping(address => address)) public playerSession;

    bool private locked;

    event GameCreated(uint256 gameId, address creator, uint256 gridSize, uint256 gameDuration, uint256 maxPlayers, uint256 stakeAmount);
    event PlayerJoined(uint256 gameId, address player);
    event GameStarted(uint256 gameId, uint256 startTime, uint256 tokensPerPlayer);
    event TokensMinted(uint256 gameId, address player, uint256 amount);
    event CellPainted(uint256 gameId, address player, uint256 x, uint256 y);
    event GameEnded(uint256 gameId, address winner, uint256 payout);
    event SessionRegistered(uint256 gameId, address player, address session);

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function createGame(
        uint256 gridSize,
        uint256 gameDuration,
        uint256 maxPlayers,
        uint256 stakeAmount
    ) external payable {
        require(stakeAmount >= 0.001 ether, "Min stake 0.001 ETH");
        require(stakeAmount <= 1 ether, "Max stake 1 ETH");
        require(msg.value == stakeAmount, "Wrong stake");
        require(gridSize == 5 || gridSize == 8 || gridSize == 10, "Invalid grid: use 5, 8 or 10");
        require(gameDuration == 60 || gameDuration == 180 || gameDuration == 300, "Invalid duration");
        require(maxPlayers >= 2 && maxPlayers <= 5, "Players must be 2-5");

        gameCounter++;
        Game storage g = games[gameCounter];
        g.creator = msg.sender;
        g.players.push(msg.sender);
        g.gridSize = gridSize;
        g.gameDuration = gameDuration;
        g.maxPlayers = maxPlayers;
        g.stakeAmount = stakeAmount;
        g.totalStake += msg.value;

        emit GameCreated(gameCounter, msg.sender, gridSize, gameDuration, maxPlayers, stakeAmount);
    }

    function joinGame(uint256 gameId) external payable {
        Game storage g = games[gameId];
        require(g.creator != address(0), "Game not found");
        require(!g.started, "Already started");
        require(!g.finished, "Already finished");
        require(g.players.length < g.maxPlayers, "Game is full");
        require(msg.value == g.stakeAmount, "Wrong stake amount");

        for (uint i = 0; i < g.players.length; i++) {
            require(g.players[i] != msg.sender, "Already joined");
        }

        g.players.push(msg.sender);
        g.totalStake += msg.value;
        emit PlayerJoined(gameId, msg.sender);
    }

    function registerSession(uint256 gameId, address session) external {
        Game storage g = games[gameId];
        require(g.creator != address(0), "Game not found");
        require(!g.finished, "Game finished");

        bool isPlayer = false;
        for (uint i = 0; i < g.players.length; i++) {
            if (g.players[i] == msg.sender) { isPlayer = true; break; }
        }
        require(isPlayer, "Not a player");
        require(session != address(0), "Invalid session address");

        address oldSession = playerSession[gameId][msg.sender];
        if (oldSession != address(0)) {
            delete sessionDelegate[gameId][oldSession];
        }

        sessionDelegate[gameId][session] = msg.sender;
        playerSession[gameId][msg.sender] = session;
        emit SessionRegistered(gameId, msg.sender, session);
    }

    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.creator == msg.sender, "Only creator can start");
        require(!g.started, "Already started");
        require(!g.finished, "Already finished");
        require(g.players.length >= 2, "Need at least 2 players");

        g.started = true;
        g.startTime = block.timestamp;

        uint256 tokensPerPlayer = (g.gridSize * g.gridSize) / g.maxPlayers;
        for (uint i = 0; i < g.players.length; i++) {
            paintTokens[gameId][g.players[i]] = tokensPerPlayer;
            emit TokensMinted(gameId, g.players[i], tokensPerPlayer);
        }

        emit GameStarted(gameId, g.startTime, tokensPerPlayer);
    }

    function paintCell(uint256 gameId, uint256 x, uint256 y) external {
        Game storage g = games[gameId];
        require(g.started, "Not started");
        require(!g.finished, "Game finished");
        require(block.timestamp < g.startTime + g.gameDuration, "Time up");
        require(x < g.gridSize && y < g.gridSize, "Out of bounds");
        require(cellOwner[gameId][x][y] == address(0), "Cell already taken");

        // Resolve real player — direct call or via session wallet
        address player = msg.sender;
        address delegateOwner = sessionDelegate[gameId][msg.sender];
        if (delegateOwner != address(0)) {
            player = delegateOwner;
        }

        require(paintTokens[gameId][player] > 0, "No paint tokens left");

        bool isPlayer = false;
        for (uint i = 0; i < g.players.length; i++) {
            if (g.players[i] == player) { isPlayer = true; break; }
        }
        require(isPlayer, "Not a player");

        paintTokens[gameId][player] -= 1;
        cellOwner[gameId][x][y] = player;
        cellCount[gameId][player] += 1;
        emit CellPainted(gameId, player, x, y);
    }

    function endGame(uint256 gameId) external noReentrant {
        Game storage g = games[gameId];
        require(g.started, "Not started");
        require(!g.finished, "Already ended");
        require(block.timestamp >= g.startTime + g.gameDuration, "Still running");

        uint256 best = 0;
        address win;
        for (uint i = 0; i < g.players.length; i++) {
            address p = g.players[i];
            uint256 c = cellCount[gameId][p];
            if (c > best) { best = c; win = p; }
        }

        g.finished = true;
        g.winner = win;
        uint256 payout = g.totalStake;
        g.totalStake = 0;

        if (win != address(0)) {
            (bool success, ) = payable(win).call{value: payout}("");
            require(success, "Transfer failed");
        } else {
            uint256 refund = payout / g.players.length;
            for (uint i = 0; i < g.players.length; i++) {
                (bool ok, ) = payable(g.players[i]).call{value: refund}("");
                require(ok, "Refund failed");
            }
        }

        emit GameEnded(gameId, win, payout);
    }

    function getPlayers(uint256 gameId) external view returns (address[] memory) {
        return games[gameId].players;
    }

    function getPaintTokens(uint256 gameId, address player) external view returns (uint256) {
        return paintTokens[gameId][player];
    }

    function getCellCount(uint256 gameId, address player) external view returns (uint256) {
        return cellCount[gameId][player];
    }

    function getCellOwner(uint256 gameId, uint256 x, uint256 y) external view returns (address) {
        return cellOwner[gameId][x][y];
    }

    function getGameInfo(uint256 gameId) external view returns (
        address creator,
        address[] memory players,
        uint256 startTime,
        uint256 gameDuration,
        uint256 gridSize,
        uint256 maxPlayers,
        uint256 stakeAmount,
        uint256 totalStake,
        bool started,
        bool finished,
        address winner
    ) {
        Game storage g = games[gameId];
        return (
            g.creator, g.players, g.startTime, g.gameDuration,
            g.gridSize, g.maxPlayers, g.stakeAmount, g.totalStake,
            g.started, g.finished, g.winner
        );
    }
}
