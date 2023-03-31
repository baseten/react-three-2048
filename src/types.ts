import { Vector3 } from "three";

export type Block = {
  id: string;
  value: number;
  isNew: boolean;
};
export type Cell = {
  block: Block | null;
  // if a block was merged in the last phase
  mergedBlock: Block | null;
};
export type GridRow = Cell[];
export type GridColumn = Cell[];
export type Grid = {
  size: number;
  rows: GridRow[];
};
export type Vector = {
  x: number;
  y: number;
};
export type Phase =
  | 'INIT'
  | 'INPUT'
  | 'ACTIVE'
  | 'TEST_WON'
  | 'WON'
  | 'SPAWN'
  | 'TEST_GAME_OVER'
  | 'GAME_OVER';
export type State = {
  phase: Phase;
  grid: Grid;
};

export type ActionType =
  | 'SET_PHASE'
  | 'SET_MOVED_DIRECTION'
  | 'ADD_NEW_BLOCK'
  | 'CLEAR_TRANSIENT_STATE'
  | 'RESTART';

export type BaseAction = {
  type: ActionType;
};
export type SetPhaseAction = {
  phase: Phase;
} & BaseAction;
export type SetDirectionAction = {
  direction: Vector;
} & BaseAction;
export type AddNewBlockAction = {
  position: Vector;
  block: Block;
} & BaseAction;
export type ClearTransientStateAction = {
  nextPhase: Phase;
} & BaseAction;
export type RestartAction = BaseAction;
export type Action =
  | SetPhaseAction
  | SetDirectionAction
  | AddNewBlockAction
  | ClearTransientStateAction
  | RestartAction;

export type BoxViewData = {
  id: string;
  value: number;
  position: Vector3;
  isNew: boolean;
  isMerged: boolean;
};
