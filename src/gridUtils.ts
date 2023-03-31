import { v4 as uuidv4 } from 'uuid';

import { BOX_SIZE, BOX_GAP } from './consts';
import { Cell, Block, Grid, Vector, GridRow, GridColumn } from './types';
import { Vector3 } from 'three';

export const buildNullArray = (size: number): null[] =>
  new Array(size).fill(null);

export const buildArray = <T>(
  size: number,
  builder: (index: number) => T,
): T[] => buildNullArray(size).map((_, index) => builder(index));

export const makeEmptyCell = (): Cell => ({
  block: null,
  mergedBlock: null,
});

export const makeNewBlock = (value = 1): Block => ({
  id: uuidv4(),
  value,
  isNew: true,
});

export function makeEmptyGrid(size: number): Grid {
  return {
    size,
    rows: buildArray(size, () => buildArray(size, makeEmptyCell)),
  };
}

/**
 * For state immutability, we clone the grid on each action before running mutations,
 * this also allows us to keep before and after state in memory to determine transitions
 * between states
 */
export function cloneGrid(grid: Grid): Grid {
  return {
    size: grid.size,
    rows: grid.rows.map((row) => row.slice()),
  };
}

export const getCellAt = (position: Vector, grid: Grid): Cell =>
  grid.rows[position.y][position.x];

// mutates grid
export const setCellAt = (position: Vector, cell: Cell, grid: Grid): Grid => {
  grid.rows[position.y][position.x] = cell;

  return grid;
};

// mutates grid
export const setBlockAt = (
  position: Vector,
  block: Block | null,
  grid: Grid,
): Grid => {
  grid.rows[position.y][position.x].block = block;

  return grid;
};

export function pluckBlocks(cells: Cell[]): (Block | null)[] {
  return cells.map((cell) => cell.block);
}

export function getColumnAt(x: number, grid: Grid): GridColumn {
  return grid.rows.map((row) => row[x]);
}

// mutates grid
export function setColumnAt(x: number, column: GridColumn, grid: Grid): Grid {
  column.forEach((cell, y) => {
    grid.rows[y][x] = cell;
  });

  return grid;
}

export function getRowAt(y: number, grid: Grid): GridRow {
  return grid.rows[y];
}

// mutates grid
export function setRowAt(y: number, row: GridRow, grid: Grid): Grid {
  grid.rows[y] = row;

  return grid;
}

type CellIterator = (cell: Cell, arg: Vector, grid: Grid) => boolean | void;

export function iterateCells(grid: Grid, iterator: CellIterator) {
  // easier to read/use old skool for loops on multidimensional array than nested maps, reduce, etc.
  // row major order
  for (let x = 0; x < grid.size; ++x) {
    for (let y = 0; y < grid.size; ++y) {
      const position = { x, y };
      const res = iterator(getCellAt(position, grid), position, grid);

      if (res === false) {
        // break on returning false from iterator
        return;
      }
    }
  }
}

type CellUpdater = (cell: Cell, position: Vector) => Cell;

// mutates grid
export function updateCells(grid: Grid, updateCell: CellUpdater): Grid {
  iterateCells(grid, (cell, position) => {
    setCellAt(position, updateCell(cell, position), grid);
  });

  return grid;
}

export function findEmptyCellPositions(grid: Grid): Vector[] {
  const result: Vector[] = [];

  iterateCells(grid, (cell, position) => {
    if (cell.block === null) {
      result.push(position);
    }
  });

  return result;
}

// We could be more performant here by storing a didSpawn boolean on state rather than
// having to iterate through all cells to test for a newly spawned cell. However, this
// would add more surface area for bugs when it is a derived state value and the array is
// really very small - seems like premature optimization
export function hasNewCell(grid: Grid): boolean {
  let result = false;

  iterateCells(grid, (cell) => {
    if (cell.block?.isNew) {
      result = true;
    }
  });

  return result;
}

/**
 * Determine if this Column or Row has matching pairs that can be merged. When used for
 * doing the merge, it should be run after cells have been moved (i.e. no null interleaved
 * values), otherwise it can be used to determine if it's possible to make a move when all
 * the cells are full
 */
export function findBlockPairs(
  direction: number,
  blocks: Block[],
): {
  hasBlockPairs: boolean;
  blockPairs: Block[][];
} {
  const blockPairs: Block[][] = [];
  // keep track of blocks which have already been paired
  const pairedBlocks: Block[] = [];

  // whichever way we're iterating, keep blocks in the original order!
  const addToBlockPairs = (blockPair: Block[]) => {
    if (direction === 1) {
      blockPairs.unshift(blockPair);
    } else {
      blockPairs.push(blockPair);
    }
  };

  // deliberately stepping 1 over array bounds
  for (let i = 0; i <= blocks.length; ++i) {
    // if direction is positive then we want to iterate backwards to find pairs and vice versa
    const index = direction === 1 ? blocks.length - i - 1 : i;
    const lastIndex = index + direction;

    // if a match, pair block and lastBlock
    const block = blocks[index];
    const lastBlock = blocks[lastIndex];

    if (
      // skip first iteration
      !lastBlock ||
      // don't pair a block twice
      pairedBlocks.includes(lastBlock)
    ) {
      continue;
    }

    if (block?.value === lastBlock.value) {
      // even though blocks will be merged, maintain original order for animation
      const pair = direction === 1 ? [lastBlock, block] : [block, lastBlock];

      addToBlockPairs(pair);
      pairedBlocks.push(block, lastBlock);
    } else if (!pairedBlocks.includes(lastBlock)) {
      // ensure that lastBlock is included if it hasn't been paired
      addToBlockPairs([lastBlock]);
    }
  }

  return {
    hasBlockPairs: Boolean(pairedBlocks.length),
    blockPairs,
  };
}

// returns shallow cloned cells array, which can be set back onto grid via mutation
export function resolveColumnOrRowInDirection(
  direction: number,
  cells: GridColumn | GridRow,
): GridColumn | GridRow {
  const blocksWithValues = pluckBlocks(cells).filter(
    (block) => block !== null,
  ) as Block[];

  // In order to implement obstacles, blocksWithValues would just need to be split into
  // separate arrays based on obstacle position. findBlockPairs would then be run against
  // each array, before joining them back together with the original obstacles

  if (!blocksWithValues.length) {
    // bail early if this whole column or row is empty
    return cells;
  }

  const { blockPairs } = findBlockPairs(direction, blocksWithValues);
  const cellCount = blockPairs.length;

  return cells.map((cell, index, arr) => {
    const blockPairIndex =
      direction === 1 ? cellCount - cells.length + index : index;
    // fallback to null to clear cell
    const cellBlockPairs = blockPairs[blockPairIndex] ?? [null];

    if (cellBlockPairs.length === 1) {
      // if no pair or null then update cell with block
      return {
        ...cell,
        block: cellBlockPairs[0],
        mergedBlock: null,
      };
    }

    if (direction === 1) {
      cellBlockPairs.reverse();
    }

    const [baseBlock, blockToMerge] = cellBlockPairs;

    return {
      ...cell,
      block: {
        ...baseBlock,
        value: baseBlock.value + blockToMerge.value,
      },
      mergedBlock: blockToMerge,
    };
  });
}

export function resolveCellsInDirection(direction: Vector, grid: Grid) {
  // maybe I don't need to clone but can rely on sub-properties changing?
  // NO I can't, maybe use ramda?
  const nextGrid = cloneGrid(grid);

  // could probably simplify both directions to a single loop but this feels more readable
  if (direction.x === 0) {
    for (let x = 0; x < nextGrid.size; ++x) {
      // read column from cloned grid
      const column = getColumnAt(x, nextGrid);
      // update column, returns shallow cloned data
      const nextColumn = resolveColumnOrRowInDirection(direction.y, column);
      // sets via mutation
      setColumnAt(x, nextColumn, nextGrid);
    }
  } else if (direction.y === 0) {
    for (let y = 0; y < nextGrid.size; ++y) {
      const row = getRowAt(y, nextGrid);
      const nextRow = resolveColumnOrRowInDirection(direction.x, row);
      setRowAt(y, nextRow, nextGrid);
    }
  } else {
    throw Error('Either direction.x or direction.y must be 0');
  }

  return nextGrid;
}

export function hasLost(grid: Grid): boolean {
  const emptyCells = findEmptyCellPositions(grid);

  if (emptyCells.length) {
    // bail early before expensive test
    return false;
  }

  // even if there are no empty cells test whether the user can make a move to create
  // empty cells before the next spawn
  for (let x = 0; x < grid.size; ++x) {
    const column = getColumnAt(x, grid);
    // we know there's no nullish blocks
    const blocks = pluckBlocks(column) as Block[];
    // direction doesn't matter in this case
    const { hasBlockPairs } = findBlockPairs(1, blocks);

    if (hasBlockPairs) {
      return false;
    }
  }

  for (let y = 0; y < grid.size; ++y) {
    const row = getRowAt(y, grid);
    const blocks = pluckBlocks(row) as Block[];
    const { hasBlockPairs } = findBlockPairs(1, blocks);

    if (hasBlockPairs) {
      return false;
    }
  }

  return true;
}

export function hasWon(grid: Grid): boolean {
  let maxBlockValue = 0;

  iterateCells(grid, (cell) => {
    maxBlockValue = Math.max(maxBlockValue, cell.block?.value ?? 0);
  });

  return maxBlockValue === 2048;
}

// three.js coord system has positive y axis -> up and origin in the center
export function gridToScreenPosition(
  gridSize: number,
  gridPosition: Vector,
): Vector3 {
  const gridScreenSize = gridSize * BOX_SIZE + (gridSize - 1) * BOX_GAP;
  const gridCenter = gridScreenSize / 2;
  const boxCenter = BOX_SIZE / 2;
  const gridToScreenCoord = (val: number) => val * (BOX_SIZE + BOX_GAP) + 1;

  return new Vector3(
    gridToScreenCoord(gridPosition.x) - gridCenter - boxCenter,
    gridToScreenCoord(gridSize - gridPosition.y - 1) - gridCenter - boxCenter,
    0,
  );
}
