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

const enum GAME_STATUS {
	ACTIVE,
	WON,
	LOST,
}

interface GameState {
	tiles: Tile[]
	status: GAME_STATUS
}

let BOARD_SIZE_X: number = 10
let BOARD_SIZE_Y: number = 10

let callCount: number = 0
let globalVisited: number[] = []

const FLAG_EMOJI: string = '&#128681;'
const MINE_EMOJI: string = '&#x1F4A3;'

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

// Calculates column index of a tile.
const getTileColumnIndex = (index: number): number => index % BOARD_SIZE_X

// Calculates row index of a tile.
const getTileRowIndex = (index: number): number =>
	Math.floor(index / BOARD_SIZE_X)

// Returns true if index can exist on board
const isValidTileIndex = (index: number): boolean =>
	index >= 0 && index < BOARD_SIZE_X * BOARD_SIZE_Y

// Returns array containing indexes of the tile and its siblings in the same row.
const getTileSiblings = (tileIndex: number) => {
	const requiredRowIndex = getTileRowIndex(tileIndex)
	return [tileIndex - 1, tileIndex, tileIndex + 1]
		.filter(isValidTileIndex)
		.filter(
			(siblingTileIndex) =>
				getTileRowIndex(siblingTileIndex) === requiredRowIndex
		)
}

const getAdjacentTileIndexes = (tileIndex: number): number[] => {
	const tileAboveIndex = tileIndex - BOARD_SIZE_X
	const tileBelowIndex = tileIndex + BOARD_SIZE_X

	return [tileAboveIndex, tileIndex, tileBelowIndex]
		.filter(isValidTileIndex)
		.map(getTileSiblings)
		.flat()
		.filter((index) => index !== tileIndex)
}

// Creates a new set of tiles
const createTileSet = (): Tile[] => {
	const numTiles = BOARD_SIZE_X * BOARD_SIZE_Y
	const numMines = BOARD_SIZE_X
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

// Initial game state
let GAME_STATE: GameState = {
	status: GAME_STATUS.ACTIVE,
	tiles: createTileSet(),
}

document.addEventListener('DOMContentLoaded', function () {
	const board: HTMLDivElement = document.querySelector('#board')!
	board.addEventListener('contextmenu', (event) =>
		handleBoardEvent(event, handleFlagTile)
	)
	board.addEventListener('click', (event) =>
		handleBoardEvent(event, handleExposeTile)
	)

	// Set board grid styles
	board.style.gridTemplateColumns = `repeat(${BOARD_SIZE_X}, 1fr)`
	board.style.gridTemplateRows = `repeat(${BOARD_SIZE_Y}, 1fr)`

	const renderTiles = () => {
		board.innerHTML = ''
		const tilesNodes = document.createDocumentFragment()

		GAME_STATE.tiles.forEach((tile, index) => {
			const listItem: HTMLLIElement = document.createElement('li')
			const tileElement: HTMLButtonElement = document.createElement('button')

			tileElement.dataset.index = index.toString()

			if (tile.isExposed) {
				tileElement.disabled = true
				tileElement.classList.add('exposed')

				if (tile.type === TILE_TYPE.SAFE) {
					if (tile.mineCount) {
						tileElement.innerHTML = tile.mineCount.toString()
						tileElement.style.color = COLOR_GRADIENT[tile.mineCount - 1]
					}
				} else if (tile.type === TILE_TYPE.MINE) {
					tileElement.innerHTML = MINE_EMOJI
					tileElement.classList.add('mine')
				}
			}
			if (tile.isFlagged) {
				tileElement.innerHTML = FLAG_EMOJI
			}

			listItem.append(tileElement)
			tilesNodes.appendChild(listItem)
		})

		board.appendChild(tilesNodes)
	}

	// Sets the new "GAME_STATE" and re-renders the tiles
	const updateGameState = (newState?: GameState): void => {
		GAME_STATE = { ...GAME_STATE, ...newState }
		renderTiles()
	}

	// Initial render
	updateGameState()

	// Handle left or right click on board
	const handleBoardEvent = (event: MouseEvent, callback: Function): void => {
		event.preventDefault()
		const target = event.target as HTMLElement
		const dataIndex = target.getAttribute('data-index')
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
			status: GAME_STATE.status,
		})
	}

	const findIndexesToExpose = (tiles: Tile[], index: number): number[] => {
		callCount++
		const surroundingIndexes = getAdjacentTileIndexes(index)
		const toExplore = surroundingIndexes.filter(
			(i) => !globalVisited.includes(i)
		)

		// Isolate neighbours with no mine count so they can be explore recursively
		const { zeroIndexes, numberedIndexes } = toExplore.reduce(
			(
				acc: { zeroIndexes: number[]; numberedIndexes: number[] },
				exploreIndex: number
			) => {
				const { mineCount } = tiles[exploreIndex]
				if (typeof mineCount === 'number') {
					return {
						...acc,
						...(mineCount === 0
							? {
									zeroIndexes: [...acc.zeroIndexes, exploreIndex],
							  }
							: {
									numberedIndexes: [...acc.numberedIndexes, exploreIndex],
							  }),
					}
				}
				return acc
			},
			{ zeroIndexes: [], numberedIndexes: [] }
		)

		globalVisited = [...globalVisited, ...surroundingIndexes, index]

		const children = zeroIndexes.map((i) => findIndexesToExpose(tiles, i))

		return [...numberedIndexes, ...zeroIndexes, ...children.flat()]
	}

	function uniqueFilter(value, index, self) {
		return self.indexOf(value) === index
	}

	const exposeSurroundingTiles = (tiles: Tile[], index: number): Tile[] => {
		const indexesToExpose = findIndexesToExpose(tiles, index)
		console.log({ indexesToExpose, callCount })
		globalVisited = []
		callCount = 0
	}

	// Expose selected tile and update game status accordingly
	const handleExposeTile = (dataIndex: number): void => {
		const { tiles } = GAME_STATE
		const tile = GAME_STATE.tiles[dataIndex]
		if (tile.isFlagged || tile.isExposed) return

		const isSafeTile = tile.type === TILE_TYPE.SAFE
		const newStatus = isSafeTile ? GAME_STATE.status : GAME_STATUS.LOST
		const isEmptyTile = isSafeTile && !tile.mineCount

		const baseTiles = isEmptyTile
			? exposeSurroundingTiles(tiles, dataIndex)
			: tiles

		updateGameState({
			tiles: [
				...tiles.slice(0, dataIndex),
				{ ...tile, isExposed: true },
				...tiles.slice(dataIndex + 1),
			],
			status: newStatus,
		})
	}
})
