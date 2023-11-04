const enum TILE_TYPE {
	SAFE,
	MINE,
}

interface Tile {
	type: TILE_TYPE
	adjacentTileIndexes: number[]
	mineCount: number | undefined
	isExposed: boolean
	isFlagged: boolean
}

interface Level {
	boardSizeX: number
	boardSizeY: number
	numMines: number
}

const enum GAME_STATUS {
	ACTIVE,
	WON,
	LOST,
}

interface GameState {
	level: Level
	tiles: Tile[]
	status: GAME_STATUS
}

const FLAG_EMOJI: string = '&#128681;'
const MINE_EMOJI: string = '&#x1F4A3;'

const LEVELS: Record<string, Level> = {
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
}

const COLOR_GRADIENT: string[] = [
	'#0000ff',
	'#2ab500',
	'#ff9900',
	'#ff0000',
	'#ff0000',
	'#ff0000',
	'#ff0000',
	'#ff0000',
	'#ff0000',
]

const DEFAULT_GAME_STATE: GameState = {
	level: LEVELS.beginner,
	status: GAME_STATUS.ACTIVE,
	tiles: [],
}

// Initial game state
let GAME_STATE: GameState = DEFAULT_GAME_STATE

// Calculates column index of a tile.
function getTileColumnIndex(index: number): number {
	return index % GAME_STATE.level.boardSizeX
}

// Calculates row index of a tile.
function getTileRowIndex(index: number): number {
	return Math.floor(index / GAME_STATE.level.boardSizeX)
}

// Returns true if index can exist on board
function isValidTileIndex(index: number): boolean {
	const { boardSizeX, boardSizeY } = GAME_STATE.level
	return index >= 0 && index < boardSizeX * boardSizeY
}

// Returns array containing indexes of the tile and its siblings in the same row.
function getTileSiblings(tileIndex: number) {
	const requiredRowIndex = getTileRowIndex(tileIndex)
	return [tileIndex - 1, tileIndex, tileIndex + 1]
		.filter(isValidTileIndex)
		.filter(
			(siblingTileIndex) =>
				getTileRowIndex(siblingTileIndex) === requiredRowIndex
		)
}

// Returns array neighbouring tile indexes
function getAdjacentTileIndexes(tileIndex: number): number[] {
	const { boardSizeX, boardSizeY } = GAME_STATE.level
	const tileAboveIndex = tileIndex - boardSizeX
	const tileBelowIndex = tileIndex + boardSizeY

	return [tileAboveIndex, tileIndex, tileBelowIndex]
		.filter(isValidTileIndex)
		.map(getTileSiblings)
		.flat()
		.filter((index) => index !== tileIndex)
}

// Creates a new set of tiles
function createTileSet({ boardSizeX, boardSizeY, numMines }: Level): Tile[] {
	const numTiles = boardSizeX * boardSizeY
	const mineIndexes: number[] = []

	// Generate random set of mine indexes
	while (mineIndexes.length < numMines) {
		const randomIndex = Math.floor(Math.random() * (numTiles - 1))
		if (!mineIndexes.includes(randomIndex)) {
			mineIndexes.push(randomIndex)
		}
	}

	// Create array of tile objects
	return Array.from({ length: numTiles }).map((_, index) => {
		const adjacentTileIndexes = getAdjacentTileIndexes(index)
		const mineCount = mineIndexes.includes(index)
			? undefined
			: adjacentTileIndexes.filter((adjacentIndex) =>
					mineIndexes.includes(adjacentIndex)
			  ).length

		return {
			type: mineIndexes.includes(index) ? TILE_TYPE.MINE : TILE_TYPE.SAFE,
			adjacentTileIndexes,
			mineCount,
			isExposed: false,
			isFlagged: false,
		}
	})
}

document.addEventListener('DOMContentLoaded', function () {
	const board: HTMLDivElement = document.querySelector('#board')!
	const resetButton: HTMLButtonElement =
		document.querySelector('#reset-button')!
	const levelButtons: NodeListOf<HTMLButtonElement> =
		document.querySelectorAll('.level button')!

	board.addEventListener('contextmenu', (event) =>
		handleBoardClickEvent(event, handleFlagTile)
	)
	board.addEventListener('click', (event) =>
		handleBoardClickEvent(event, handleExposeTile)
	)

	const renderTiles = (): void => {
		board.innerHTML = ''
		const tilesNodes = document.createDocumentFragment()

		GAME_STATE.tiles.forEach((tile, index) => {
			const listItem: HTMLLIElement = document.createElement('li')
			const tileElement: HTMLButtonElement = document.createElement('button')

			tileElement.dataset.index = index.toString()

			const { isExposed, isFlagged, type } = tile
			const isSafeTile = type === TILE_TYPE.SAFE

			// If game ACTIVE
			if (GAME_STATE.status === GAME_STATUS.ACTIVE) {
				if (isExposed) {
					tileElement.disabled = true
					tileElement.classList.add('exposed')
					if (tile.mineCount) {
						tileElement.innerHTML = tile.mineCount.toString()
						tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1]
					}
				}
				if (isFlagged) {
					tileElement.innerHTML = FLAG_EMOJI
				}
			}

			// If game WON
			if (GAME_STATE.status === GAME_STATUS.WON) {
				tileElement.disabled = true
				if (isSafeTile) {
					tileElement.classList.add('exposed')
					if (tile.mineCount) {
						tileElement.innerHTML = tile.mineCount.toString()
						tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1]
					}
				} else {
					tileElement.innerHTML = FLAG_EMOJI
				}
			}

			// If game LOST
			if (GAME_STATE.status === GAME_STATUS.LOST) {
				tileElement.disabled = true
				if (isSafeTile) {
					if (isExposed) {
						tileElement.classList.add('exposed')
						if (tile.mineCount) {
							tileElement.innerHTML = tile.mineCount.toString()
							tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1]
						}
					}
					if (isFlagged) {
						tileElement.innerHTML = FLAG_EMOJI
						tileElement.classList.add('wrongly-flagged')
					}
				} else {
					if (isFlagged) {
						tileElement.innerHTML = FLAG_EMOJI
					} else {
						tileElement.classList.add('exposed')
						tileElement.innerHTML = MINE_EMOJI
						if (isExposed) {
							tileElement.classList.add('mine')
						}
					}
				}
			}

			listItem.append(tileElement)
			tilesNodes.appendChild(listItem)
		})

		board.appendChild(tilesNodes)
	}

	// Sets the new "GAME_STATE" and re-renders the tiles
	const updateGameState = (state?: Partial<GameState>): void => {
		const newState = { ...GAME_STATE, ...state }
		// Set board grid styles
		board.style.gridTemplateColumns = `repeat(${newState?.level?.boardSizeX}, 1fr)`
		board.style.gridTemplateRows = `repeat(${newState?.level?.boardSizeY}, 1fr)`

		GAME_STATE = newState
		renderTiles()
	}

	// To start or reset game state
	const resetGameState = (config?: Partial<GameState>) => {
		const state = { ...DEFAULT_GAME_STATE, ...config }
		updateGameState({
			...state,
			tiles: createTileSet(state.level),
		})
	}

	// Initial render
	resetGameState()

	// Reset game
	resetButton.addEventListener('click', () =>
		resetGameState({ level: GAME_STATE.level })
	)

	// Set game level
	const handleSetSelectedLevel = (event: MouseEvent): void => {
		const target = event.target as HTMLButtonElement
		const selectedLevel = target?.getAttribute('data-level')
		if (!selectedLevel) return

		const level = LEVELS[selectedLevel]
		if (!level) return

		resetGameState({ level })
	}
	// Add event listener for level changes
	levelButtons.forEach((button) => {
		button.addEventListener('click', handleSetSelectedLevel)
	})

	// Handle left or right click on board
	const handleBoardClickEvent = (
		event: MouseEvent,
		callback: Function
	): void => {
		event.preventDefault()
		const target = event.target as HTMLButtonElement
		const dataIndex = target?.getAttribute('data-index')
		if (!dataIndex) return
		callback(parseInt(dataIndex))
	}

	// Toggle flag if tile is not exposed
	const handleFlagTile = (dataIndex: number): void => {
		const updatedTiles = GAME_STATE.tiles.map((tile: Tile, index: number) => {
			if (tile.isExposed || index !== dataIndex) return tile
			return {
				...tile,
				isFlagged: !tile.isFlagged,
			}
		})
		updateGameState({
			tiles: updatedTiles,
		})
	}

	const findIndexesToExpose = (index: number): number[] => {
		const stack: number[] = [index]
		const result: Set<number> = new Set() /* Use Set to prevent duplication */
		const visitedIndexes: Set<number> = new Set()

		while (stack.length > 0) {
			const latestIndex: number = stack.pop()!

			if (visitedIndexes.has(latestIndex)) {
				continue
			}

			visitedIndexes.add(latestIndex)
			result.add(latestIndex)

			const surroundingIndexes = getAdjacentTileIndexes(latestIndex)

			surroundingIndexes.forEach((exploreIndex) => {
				const { type, isExposed, isFlagged, mineCount } =
					GAME_STATE.tiles[exploreIndex]

				if (
					!visitedIndexes.has(exploreIndex) &&
					type === TILE_TYPE.SAFE &&
					!isExposed &&
					!isFlagged
				) {
					if (mineCount) {
						result.add(exploreIndex)
					} else if (!stack.includes(exploreIndex)) {
						/* Prevent adding duplicate values to stack */
						stack.push(exploreIndex)
					}
				} else {
					visitedIndexes.add(exploreIndex)
				}
			})
		}
		return Array.from(result)
	}

	// Expose selected tile and update game status accordingly
	const handleExposeTile = (dataIndex: number): void => {
		const tile = GAME_STATE.tiles[dataIndex]
		if (tile.isFlagged || tile.isExposed) return
		const isSafeTile = tile.type === TILE_TYPE.SAFE

		// Update tile states
		const tiles = [...GAME_STATE.tiles]
		const indexesToExpose =
			isSafeTile && !tile.mineCount
				? [dataIndex, ...findIndexesToExpose(dataIndex)]
				: [dataIndex]

		indexesToExpose.forEach((index) => {
			tiles[index] = { ...tiles[index], isExposed: true }
		})

		// Determine new status
		// Opened mine tile = LOST
		// Some safe tile still not expose = ACTIVE
		// All safe tiles exposed = WON
		const status = !isSafeTile
			? GAME_STATUS.LOST
			: tiles
					.filter(({ type }) => type === TILE_TYPE.SAFE)
					.some(({ isExposed }) => !isExposed)
			? GAME_STATUS.ACTIVE
			: GAME_STATUS.WON

		updateGameState({
			tiles,
			status,
		})
	}
})
