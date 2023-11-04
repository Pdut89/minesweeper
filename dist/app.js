"use strict";
const FLAG_EMOJI = '&#128681;';
const MINE_EMOJI = '&#x1F4A3;';
const LEVELS = {
    beginner: {
        boardSizeX: 16,
        boardSizeY: 16,
        numMines: 40,
    },
    intermediate: {
        boardSizeX: 16,
        boardSizeY: 16,
        numMines: 40,
    },
    expert: {
        boardSizeX: 30,
        boardSizeY: 16,
        numMines: 99,
    },
};
const COLOR_GRADIENT = [
    '#0000ff',
    '#2ab500',
    '#ff9900',
    '#ff0000',
    '#ff0000',
    '#ff0000',
    '#ff0000',
    '#ff0000',
    '#ff0000',
];
const DEFAULT_GAME_STATE = {
    level: LEVELS.beginner,
    status: 0 /* GAME_STATUS.ACTIVE */,
    tiles: [],
};
// Initial game state
let GAME_STATE = DEFAULT_GAME_STATE;
// Calculates column index of a tile.
function getTileColumnIndex(index) {
    return index % GAME_STATE.level.boardSizeX;
}
// Calculates row index of a tile.
function getTileRowIndex(index) {
    return Math.floor(index / GAME_STATE.level.boardSizeX);
}
// Returns true if index can exist on board
function isValidTileIndex(index) {
    const { boardSizeX, boardSizeY } = GAME_STATE.level;
    return index >= 0 && index < boardSizeX * boardSizeY;
}
// Returns array containing indexes of the tile and its siblings in the same row.
function getTileSiblings(tileIndex) {
    const requiredRowIndex = getTileRowIndex(tileIndex);
    return [tileIndex - 1, tileIndex, tileIndex + 1]
        .filter(isValidTileIndex)
        .filter((siblingTileIndex) => getTileRowIndex(siblingTileIndex) === requiredRowIndex);
}
// Returns array neighbouring tile indexes
function getAdjacentTileIndexes(tileIndex) {
    const { boardSizeX, boardSizeY } = GAME_STATE.level;
    const tileAboveIndex = tileIndex - boardSizeX;
    const tileBelowIndex = tileIndex + boardSizeY;
    return [tileAboveIndex, tileIndex, tileBelowIndex]
        .filter(isValidTileIndex)
        .map(getTileSiblings)
        .flat()
        .filter((index) => index !== tileIndex);
}
// Creates a new set of tiles
function createTileSet({ boardSizeX, boardSizeY, numMines }) {
    const numTiles = boardSizeX * boardSizeY;
    const mineIndexes = [];
    // Generate random set of mine indexes
    while (mineIndexes.length < numMines) {
        const randomIndex = Math.floor(Math.random() * (numTiles - 1));
        if (!mineIndexes.includes(randomIndex)) {
            mineIndexes.push(randomIndex);
        }
    }
    // Create array of tile objects
    return Array.from({ length: numTiles }).map((_, index) => {
        const adjacentTileIndexes = getAdjacentTileIndexes(index);
        const mineCount = mineIndexes.includes(index)
            ? undefined
            : adjacentTileIndexes.filter((adjacentIndex) => mineIndexes.includes(adjacentIndex)).length;
        return {
            type: mineIndexes.includes(index) ? 1 /* TILE_TYPE.MINE */ : 0 /* TILE_TYPE.SAFE */,
            adjacentTileIndexes,
            mineCount,
            isExposed: false,
            isFlagged: false,
        };
    });
}
document.addEventListener('DOMContentLoaded', function () {
    const board = document.querySelector('#board');
    const resetButton = document.querySelector('#reset-button');
    const levelButtons = document.querySelectorAll('.level button');
    board.addEventListener('contextmenu', (event) => handleBoardClickEvent(event, handleFlagTile));
    board.addEventListener('click', (event) => handleBoardClickEvent(event, handleExposeTile));
    const renderTiles = () => {
        board.innerHTML = '';
        const tilesNodes = document.createDocumentFragment();
        GAME_STATE.tiles.forEach((tile, index) => {
            const listItem = document.createElement('li');
            const tileElement = document.createElement('button');
            tileElement.dataset.index = index.toString();
            const { isExposed, isFlagged, type } = tile;
            const isSafeTile = type === 0 /* TILE_TYPE.SAFE */;
            // If game ACTIVE
            if (GAME_STATE.status === 0 /* GAME_STATUS.ACTIVE */) {
                if (isExposed) {
                    tileElement.disabled = true;
                    tileElement.classList.add('exposed');
                    if (tile.mineCount) {
                        tileElement.innerHTML = tile.mineCount.toString();
                        tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1];
                    }
                }
                if (isFlagged) {
                    tileElement.innerHTML = FLAG_EMOJI;
                }
            }
            // If game WON
            if (GAME_STATE.status === 1 /* GAME_STATUS.WON */) {
                tileElement.disabled = true;
                if (isSafeTile) {
                    tileElement.classList.add('exposed');
                    if (tile.mineCount) {
                        tileElement.innerHTML = tile.mineCount.toString();
                        tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1];
                    }
                }
                else {
                    tileElement.innerHTML = FLAG_EMOJI;
                }
            }
            // If game LOST
            if (GAME_STATE.status === 2 /* GAME_STATUS.LOST */) {
                tileElement.disabled = true;
                if (isSafeTile) {
                    if (isExposed) {
                        tileElement.classList.add('exposed');
                        if (tile.mineCount) {
                            tileElement.innerHTML = tile.mineCount.toString();
                            tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1];
                        }
                    }
                    if (isFlagged) {
                        tileElement.innerHTML = FLAG_EMOJI;
                        tileElement.classList.add('wrongly-flagged');
                    }
                }
                else {
                    if (isFlagged) {
                        tileElement.innerHTML = FLAG_EMOJI;
                    }
                    else {
                        tileElement.classList.add('exposed');
                        tileElement.innerHTML = MINE_EMOJI;
                        if (isExposed) {
                            tileElement.classList.add('mine');
                        }
                    }
                }
            }
            listItem.append(tileElement);
            tilesNodes.appendChild(listItem);
        });
        board.appendChild(tilesNodes);
    };
    // Sets the new "GAME_STATE" and re-renders the tiles
    const updateGameState = (state) => {
        var _a, _b;
        const newState = Object.assign(Object.assign({}, GAME_STATE), state);
        // Set board grid styles
        board.style.gridTemplateColumns = `repeat(${(_a = newState === null || newState === void 0 ? void 0 : newState.level) === null || _a === void 0 ? void 0 : _a.boardSizeX}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${(_b = newState === null || newState === void 0 ? void 0 : newState.level) === null || _b === void 0 ? void 0 : _b.boardSizeY}, 1fr)`;
        GAME_STATE = newState;
        renderTiles();
    };
    // To start or reset game state
    const resetGameState = (config) => {
        const state = Object.assign(Object.assign({}, DEFAULT_GAME_STATE), config);
        updateGameState(Object.assign(Object.assign({}, state), { tiles: createTileSet(state.level) }));
    };
    // Initial render
    resetGameState();
    // Reset game
    resetButton.addEventListener('click', () => resetGameState({ level: GAME_STATE.level }));
    // Set game level
    const handleSetSelectedLevel = (event) => {
        const target = event.target;
        const selectedLevel = target === null || target === void 0 ? void 0 : target.getAttribute('data-level');
        if (!selectedLevel)
            return;
        const level = LEVELS[selectedLevel];
        if (!level)
            return;
        resetGameState({ level });
    };
    // Add event listener for level changes
    levelButtons.forEach((button) => {
        button.addEventListener('click', handleSetSelectedLevel);
    });
    // Handle left or right click on board
    const handleBoardClickEvent = (event, callback) => {
        event.preventDefault();
        const target = event.target;
        const dataIndex = target === null || target === void 0 ? void 0 : target.getAttribute('data-index');
        if (!dataIndex)
            return;
        callback(parseInt(dataIndex));
    };
    // Toggle flag if tile is not exposed
    const handleFlagTile = (dataIndex) => {
        const updatedTiles = GAME_STATE.tiles.map((tile, index) => {
            if (tile.isExposed || index !== dataIndex)
                return tile;
            return Object.assign(Object.assign({}, tile), { isFlagged: !tile.isFlagged });
        });
        updateGameState({
            tiles: updatedTiles,
        });
    };
    const findIndexesToExpose = (index) => {
        const stack = [index];
        const result = new Set(); /* Use Set to prevent duplication */
        const visitedIndexes = new Set();
        while (stack.length > 0) {
            const latestIndex = stack.pop();
            if (visitedIndexes.has(latestIndex)) {
                continue;
            }
            visitedIndexes.add(latestIndex);
            result.add(latestIndex);
            const surroundingIndexes = getAdjacentTileIndexes(latestIndex);
            surroundingIndexes.forEach((exploreIndex) => {
                const { type, isExposed, isFlagged, mineCount } = GAME_STATE.tiles[exploreIndex];
                if (!visitedIndexes.has(exploreIndex) &&
                    type === 0 /* TILE_TYPE.SAFE */ &&
                    !isExposed &&
                    !isFlagged) {
                    if (mineCount) {
                        result.add(exploreIndex);
                    }
                    else if (!stack.includes(exploreIndex)) {
                        /* Prevent adding duplicate values to stack */
                        stack.push(exploreIndex);
                    }
                }
                else {
                    visitedIndexes.add(exploreIndex);
                }
            });
        }
        return Array.from(result);
    };
    // Expose selected tile and update game status accordingly
    const handleExposeTile = (dataIndex) => {
        const tile = GAME_STATE.tiles[dataIndex];
        if (tile.isFlagged || tile.isExposed)
            return;
        const isSafeTile = tile.type === 0 /* TILE_TYPE.SAFE */;
        // Update tile states
        const tiles = [...GAME_STATE.tiles];
        const indexesToExpose = isSafeTile && !tile.mineCount
            ? [dataIndex, ...findIndexesToExpose(dataIndex)]
            : [dataIndex];
        indexesToExpose.forEach((index) => {
            tiles[index] = Object.assign(Object.assign({}, tiles[index]), { isExposed: true });
        });
        // Determine new status
        // Opened mine tile = LOST
        // Some safe tile still not expose = ACTIVE
        // All safe tiles exposed = WON
        const status = !isSafeTile
            ? 2 /* GAME_STATUS.LOST */
            : tiles
                .filter(({ type }) => type === 0 /* TILE_TYPE.SAFE */)
                .some(({ isExposed }) => !isExposed)
                ? 0 /* GAME_STATUS.ACTIVE */
                : 1 /* GAME_STATUS.WON */;
        updateGameState({
            tiles,
            status,
        });
    };
});
