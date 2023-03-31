import { Cell, Grid } from './types';
import {
  getColumnAt,
  getRowAt,
  makeEmptyCell,
  resolveCellsInDirection,
  setColumnAt,
  setRowAt,
} from './gridUtils';

// convenience for providing test cases
type CellValue = number | null;
type CellValueRows = CellValue[][];

function makeCellWithBlock(id: string, value: number): Cell {
  return {
    block: {
      id,
      value,
      isNew: false,
    },
    mergedBlock: null,
  };
}

function cellValueRowsToGrid(cellValueRows: CellValueRows): Grid {
  let id = 1;
  const size = cellValueRows.length;

  return {
    size,
    rows: cellValueRows.map((row) =>
      row.map((value) => ({
        block: value
          ? {
              id: `${id++}`,
              value,
              isNew: false,
            }
          : null,
        mergedBlock: null,
      })),
    ),
  };
}

function gridCellsToValues(cells: Cell[]): CellValue[] {
  return cells.map((cell) => cell.block?.value ?? null);
}

function gridToCellValueRows(grid: Grid): CellValueRows {
  return grid.rows.map((row) => gridCellsToValues(row));
}

const _ = null;

// mocks from spec doc
const mockGrid = [
  [_, _, 2, _, _, 2],
  [_, 2, _, _, _, _],
  [_, _, _, _, _, _],
  [_, 4, _, _, _, 2],
  [_, _, _, 2, _, _],
  [_, _, _, _, _, _],
];

const mockGridMoveUp = [
  [_, 2, 2, 2, _, 4],
  [_, 4, _, _, _, _],
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
];

const mockGridMoveDown = [
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
  [_, _, _, _, _, _],
  [_, 2, _, _, _, _],
  [_, 4, 2, 2, _, 4],
];

const mockGridMoveLeft = [
  [4, _, _, _, _, _],
  [2, _, _, _, _, _],
  [_, _, _, _, _, _],
  [4, 2, _, _, _, _],
  [2, _, _, _, _, _],
  [_, _, _, _, _, _],
];

const mockGridMoveRight = [
  [_, _, _, _, _, 4],
  [_, _, _, _, _, 2],
  [_, _, _, _, _, _],
  [_, _, _, _, 4, 2],
  [_, _, _, _, _, 2],
  [_, _, _, _, _, _],
];

describe('use2048', () => {
  it('retrieves a column correctly', () => {
    const grid = cellValueRowsToGrid(mockGrid);
    expect(gridCellsToValues(getColumnAt(1, grid))).toEqual([_, 2, _, 4, _, _]);
  });

  it('retrieves a row correctly', () => {
    const grid = cellValueRowsToGrid(mockGrid);
    expect(gridCellsToValues(getRowAt(3, grid))).toEqual([_, 4, _, _, _, 2]);
  });

  it('sets a column correctly', () => {
    const grid = cellValueRowsToGrid(mockGrid);
    const newColumn = [
      makeCellWithBlock('1', 4),
      makeEmptyCell(),
      makeCellWithBlock('2', 2),
      makeEmptyCell(),
      makeEmptyCell(),
      makeCellWithBlock('3', 8),
    ];

    setColumnAt(1, newColumn, grid);

    expect(getColumnAt(1, grid)).toEqual([
      {
        block: {
          id: '1',
          value: 4,
          isNew: false,
        },
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: {
          id: '2',
          value: 2,
          isNew: false,
        },
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: {
          id: '3',
          value: 8,
          isNew: false,
        },
        mergedBlock: null,
      },
    ]);

    expect(gridToCellValueRows(grid)).toEqual([
      [_, 4, 2, _, _, 2],
      [_, _, _, _, _, _],
      [_, 2, _, _, _, _],
      [_, _, _, _, _, 2],
      [_, _, _, 2, _, _],
      [_, 8, _, _, _, _],
    ]);
  });

  it('sets a row correctly', () => {
    const grid = cellValueRowsToGrid(mockGrid);
    const newRow = [
      makeCellWithBlock('1', 4),
      makeEmptyCell(),
      makeCellWithBlock('2', 2),
      makeEmptyCell(),
      makeEmptyCell(),
      makeCellWithBlock('3', 8),
    ];

    setRowAt(3, newRow, grid);

    expect(getRowAt(3, grid)).toEqual([
      {
        block: {
          id: '1',
          value: 4,
          isNew: false,
        },
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: {
          id: '2',
          value: 2,
          isNew: false,
        },
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: null,
        mergedBlock: null,
      },
      {
        block: {
          id: '3',
          value: 8,
          isNew: false,
        },
        mergedBlock: null,
      },
    ]);

    expect(gridToCellValueRows(grid)).toEqual([
      [_, _, 2, _, _, 2],
      [_, 2, _, _, _, _],
      [_, _, _, _, _, _],
      [4, _, 2, _, _, 8],
      [_, _, _, 2, _, _],
      [_, _, _, _, _, _],
    ]);
  });

  it('resolves a grid correctly up', () => {
    const result = resolveCellsInDirection(
      {
        x: 0,
        y: -1,
      },
      cellValueRowsToGrid(mockGrid),
    );

    expect(gridToCellValueRows(result)).toEqual(mockGridMoveUp);
  });

  it('resolves a grid correctly down', () => {
    const result = resolveCellsInDirection(
      {
        x: 0,
        y: 1,
      },
      cellValueRowsToGrid(mockGrid),
    );

    expect(gridToCellValueRows(result)).toEqual(mockGridMoveDown);
  });

  it('resolves a grid correctly left', () => {
    const result = resolveCellsInDirection(
      {
        x: -1,
        y: 0,
      },
      cellValueRowsToGrid(mockGrid),
    );

    expect(gridToCellValueRows(result)).toEqual(mockGridMoveLeft);
  });

  it('resolves a grid correctly right', () => {
    const result = resolveCellsInDirection(
      {
        x: 1,
        y: 0,
      },
      cellValueRowsToGrid(mockGrid),
    );

    expect(gridToCellValueRows(result)).toEqual(mockGridMoveRight);
  });
});
