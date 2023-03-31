import {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  State,
  Action,
  SetPhaseAction,
  SetDirectionAction,
  AddNewBlockAction,
  ClearTransientStateAction,
  Block,
  BoxViewData,
  Vector,
  Phase,
  Grid,
} from './types';
import {
  makeEmptyGrid,
  setBlockAt,
  makeNewBlock,
  resolveCellsInDirection,
  cloneGrid,
  updateCells,
  iterateCells,
  gridToScreenPosition,
  hasLost,
  hasWon,
  hasNewCell,
  findEmptyCellPositions,
} from './gridUtils';
import { arrayRandomItem, randomIntInclusive } from './utils';

function initReducer(size: number): State {
  const grid = makeEmptyGrid(size);
  const x = randomIntInclusive(0, size - 1);
  const y = randomIntInclusive(0, size - 1);

  return {
    phase: 'INIT',
    grid: setBlockAt({ x, y }, makeNewBlock(2), grid),
  };
}

function reducer(state: State, action: Action): State {
  const { grid } = state;

  switch (action.type) {
    case 'SET_PHASE':
      return {
        ...state,
        phase: (action as SetPhaseAction).phase,
      };

    case 'SET_MOVED_DIRECTION':
      return {
        phase: 'ACTIVE',
        grid: resolveCellsInDirection(
          (action as SetDirectionAction).direction,
          grid,
        ),
      };

    case 'ADD_NEW_BLOCK': {
      const nextGrid = cloneGrid(grid);
      const { block, position } = action as AddNewBlockAction;

      return {
        ...state,
        grid: setBlockAt(position, block, nextGrid),
      };
    }

    case 'CLEAR_TRANSIENT_STATE': {
      const nextGrid = cloneGrid(grid);

      return {
        ...state,
        phase: (action as ClearTransientStateAction).nextPhase,
        grid: updateCells(nextGrid, (cell) => {
          const { block, mergedBlock } = cell;

          if (!mergedBlock && !block?.isNew) {
            return cell;
          }

          return {
            block: {
              ...(block as Block),
              isNew: false,
            },
            mergedBlock: null,
          };
        }),
      };
    }

    case 'RESTART': {
      return initReducer(state.grid.size);
    }
  }
}

const KEY_DIRECTION_MAP: Record<string, Vector> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const useBoxViewData = (grid: Grid): BoxViewData[] => {
  return useMemo(() => {
    const result: BoxViewData[] = [];

    iterateCells(grid, (cell, position) => {
      if (!cell.block) {
        return;
      }

      const { block, mergedBlock } = cell;
      const screenPosition = gridToScreenPosition(grid.size, position);

      result.push({
        ...block,
        position: screenPosition,
        isMerged: false,
      });

      if (mergedBlock) {
        result.push({
          ...mergedBlock,
          position: screenPosition,
          isMerged: true,
        });
      }
    });

    return result;
  }, [grid]);
};

const useBoxAnimationsCompleteCallback = (
  boxCount: number,
  phase: Phase,
  dispatch: Dispatch<Action>,
) => {
  const animationCompleteCount = useRef(0);

  return useCallback(() => {
    // spawn total animation complete is always 1
    const totalCompleteCount = phase === 'ACTIVE' ? boxCount : 1;

    animationCompleteCount.current += 1;

    if (animationCompleteCount.current === totalCompleteCount) {
      animationCompleteCount.current = 0;

      const nextPhaseMap: Partial<Record<Phase, Phase>> = {
        INIT: 'INPUT',
        ACTIVE: 'TEST_WON',
        SPAWN: 'TEST_GAME_OVER',
      };

      const nextPhase = nextPhaseMap[phase];

      if (!nextPhase) {
        throw Error(
          `Animation complete fired during unexpected phase ${phase}`,
        );
      }

      dispatch({
        type: 'CLEAR_TRANSIENT_STATE',
        nextPhase,
      });
    }
  }, [phase, boxCount, dispatch]);
};

type EffectCleanupHandler = () => void;
type PhaseHandler = (grid: Grid) => EffectCleanupHandler | void;

const usePhaseSystem = (state: State, dispatch: Dispatch<Action>) => {
  const phaseHandlers: Partial<Record<Phase, PhaseHandler>> = useMemo(
    () => ({
      INPUT: () => {
        const inputHandler = (e: KeyboardEvent) => {
          const direction = KEY_DIRECTION_MAP[e.key];

          if (!direction) {
            return;
          }

          // sets phase to ACTIVE
          dispatch({
            type: 'SET_MOVED_DIRECTION',
            direction,
          });
        };

        // only allow user interaction during INPUT phase
        window.addEventListener('keydown', inputHandler);
        return () => window.removeEventListener('keydown', inputHandler);
      },

      TEST_WON: (grid) => {
        const nextPhase: Phase = hasWon(grid) ? 'WON' : 'SPAWN';
        dispatch({
          type: 'SET_PHASE',
          phase: nextPhase,
        });
      },

      WON: () => {
        alert('YOU WIN! Press OK to play again');

        dispatch({
          type: 'RESTART',
        });
      },

      SPAWN: (grid) => {
        // Spawn block and position here to keep reducer pure, otherwise React 18 strict mode
        // could run reducer twice and spawn 2 blocks. Because position and id of block are
        // random and the grid dep will change after a spawn, we can't rely on phase change
        // alone to prevent this effect firing more than once, so test if a cell has already
        // been spawned
        if (hasNewCell(grid)) {
          return;
        }

        const emptyCellPositions = findEmptyCellPositions(grid);

        dispatch({
          type: 'ADD_NEW_BLOCK',
          position: arrayRandomItem(emptyCellPositions),
          block: makeNewBlock(2),
        });
      },

      TEST_GAME_OVER: (grid) => {
        const nextAction: Action = hasLost(grid)
          ? { type: 'SET_PHASE', phase: 'GAME_OVER' }
          : { type: 'CLEAR_TRANSIENT_STATE', nextPhase: 'INPUT' };

        dispatch(nextAction);
      },

      GAME_OVER: () => {
        alert('GAME OVER! Press OK to play again');

        dispatch({
          type: 'RESTART',
        });
      },
    }),
    [dispatch],
  );

  const { phase, grid } = state;

  useEffect(() => {
    return phaseHandlers[phase]?.(grid);
  }, [phase, grid, phaseHandlers]);
};

export const use2048 = (
  size: number,
): {
  state: State;
  boxViewData: BoxViewData[];
  handleBoxAnimationComplete: () => void;
} => {
  const [state, dispatch] = useReducer(reducer, size, initReducer);
  const { phase, grid } = state;

  const boxViewData = useBoxViewData(grid);

  const handleBoxAnimationComplete = useBoxAnimationsCompleteCallback(
    boxViewData.length,
    phase,
    dispatch,
  );

  usePhaseSystem(state, dispatch);

  return {
    state,
    boxViewData,
    handleBoxAnimationComplete,
  };
};
