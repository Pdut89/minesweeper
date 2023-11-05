"use strict";
const FLAG_EMOJI = '&#128681;';
const MINE_EMOJI = '&#x1F4A3;';
const LONG_PRESS_TIMEOUT_MS = 550;
const LEVELS = {
    beginner: {
        boardSizeX: 8,
        boardSizeY: 8,
        numMines: 10,
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
// Calculates row index of a tile.
function getTileRowIndex(index, boardSizeX) {
    return Math.floor(index / boardSizeX);
}
// Returns true if index can exist on board
function isValidTileIndex(index, level) {
    const { boardSizeX, boardSizeY } = level;
    return index >= 0 && index < boardSizeX * boardSizeY;
}
// Returns array containing indexes of the tile and its siblings in the same row.
function getTileSiblings(tileIndex, level) {
    const { boardSizeX } = level;
    const requiredRowIndex = getTileRowIndex(tileIndex, boardSizeX);
    return [tileIndex - 1, tileIndex, tileIndex + 1]
        .filter((index) => isValidTileIndex(index, level))
        .filter((siblingTileIndex) => getTileRowIndex(siblingTileIndex, boardSizeX) === requiredRowIndex);
}
// Returns array neighbouring tile indexes
function getAdjacentTileIndexes(tileIndex, level) {
    const { boardSizeX } = level;
    const tileAboveIndex = tileIndex - boardSizeX;
    const tileBelowIndex = tileIndex + boardSizeX;
    return [tileAboveIndex, tileIndex, tileBelowIndex]
        .filter((index) => isValidTileIndex(index, level))
        .map((index) => getTileSiblings(index, level))
        .flat()
        .filter((index) => index !== tileIndex);
}
// Creates a new set of tiles
function createTileSet(level) {
    const { boardSizeX, boardSizeY, numMines } = level;
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
        const adjacentTileIndexes = getAdjacentTileIndexes(index, level);
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
    let longPressTimeout;
    const board = document.querySelector('#board');
    const resetButton = document.querySelector('#reset-button');
    const levelButtons = document.querySelectorAll('.level');
    board.addEventListener('contextmenu', (event) => handleBoardClickEvent(event, handleFlagTile));
    board.addEventListener('click', (event) => handleBoardClickEvent(event, handleExposeTile));
    board.addEventListener('touchstart', function (event) {
        const target = event.target;
        const dataIndex = target.getAttribute('data-index');
        if (!dataIndex)
            return;
        const index = parseInt(dataIndex);
        const { isFlagged: initialIsFlagged } = GAME_STATE.tiles[index];
        longPressTimeout = setTimeout(() => {
            // Only flag tile if it was not already flagged by the 'contextMenu' event listener
            if (GAME_STATE.tiles[index].isFlagged === initialIsFlagged) {
                event.preventDefault();
                handleFlagTile(index);
            }
        }, LONG_PRESS_TIMEOUT_MS);
    });
    board.addEventListener('touchend', () => {
        clearTimeout(longPressTimeout);
    });
    const renderTiles = ({ tiles, status }) => {
        board.innerHTML = '';
        const tilesNodes = document.createDocumentFragment();
        tiles.forEach((tile, index) => {
            const listItem = document.createElement('li');
            const tileElement = document.createElement('button');
            tileElement.dataset.index = index.toString();
            const { isExposed, isFlagged, type } = tile;
            const isSafeTile = type === 0 /* TILE_TYPE.SAFE */;
            // If game ACTIVE
            if (status === 0 /* GAME_STATUS.ACTIVE */) {
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
            if (status === 1 /* GAME_STATUS.WON */) {
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
            if (status === 2 /* GAME_STATUS.LOST */) {
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
        const newState = Object.assign(Object.assign({}, GAME_STATE), state);
        // Set board grid styles
        const { boardSizeX, boardSizeY } = newState.level;
        board.style.gridTemplateColumns = `repeat(${boardSizeX}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${boardSizeY}, 1fr)`;
        GAME_STATE = newState;
        renderTiles(newState);
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
        const { tiles } = GAME_STATE;
        if (tiles[dataIndex].isExposed)
            return;
        updateGameState({
            tiles: [
                ...tiles.slice(0, dataIndex),
                Object.assign(Object.assign({}, tiles[dataIndex]), { isFlagged: !tiles[dataIndex].isFlagged }),
                ...tiles.slice(dataIndex + 1),
            ],
        });
    };
    const findIndexesToExpose = (index, level, tiles) => {
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
            const { adjacentTileIndexes } = tiles[latestIndex];
            adjacentTileIndexes.forEach((exploreIndex) => {
                const { type, isExposed, isFlagged, mineCount } = tiles[exploreIndex];
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
        const { tiles: previousTiles, level } = GAME_STATE;
        const tile = previousTiles[dataIndex];
        if (tile.isFlagged || tile.isExposed)
            return;
        const isSafeTile = tile.type === 0 /* TILE_TYPE.SAFE */;
        // Update tile states
        const tiles = [...GAME_STATE.tiles];
        const indexesToExpose = isSafeTile && !tile.mineCount
            ? [dataIndex, ...findIndexesToExpose(dataIndex, level, previousTiles)]
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
