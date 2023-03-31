import React from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { Texture } from 'three';
import styled from 'styled-components';

import { GRID_SIZE } from './consts';
import { use2048 } from './use2048';
import Box from './Box';

const CanvasOuterContainer = styled.div`
  width: 800px;
  height: 800px;
`;

type Game2048Props = {
  gridSize: number;
  boxTexture: Texture;
};

function Game2048({ gridSize, boxTexture }: Game2048Props) {
  const { state, boxViewData, handleBoxAnimationComplete } = use2048(gridSize);
  const { phase } = state;

  return (
    <>
      {boxViewData.map(({ id, value, position, isNew, isMerged }) => (
        <Box
          key={id}
          isNew={isNew}
          isMerged={isMerged}
          phase={phase}
          value={value}
          texture={boxTexture}
          position={position}
          onAnimationComplete={handleBoxAnimationComplete}
        />
      ))}
    </>
  );
}

function App() {
  const boxTexture = useLoader(TextureLoader, '2048-sheet.png');

  // User customisable grid sizes can be implemented by passing the gridSize prop down
  // to Game2048 (perhaps by using a Select component or similar). By setting the key prop
  // on Game2048 to the chosen grid size, this would force a remount of the game and a
  // reset of all internal state
  return (
    <CanvasOuterContainer>
      {boxTexture && (
        <Canvas
          camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 10] }}
          shadows={true}
        >
          <ambientLight />
          <pointLight position={[-3, 3, 10]} />
          <Game2048 gridSize={GRID_SIZE} boxTexture={boxTexture} />
        </Canvas>
      )}
    </CanvasOuterContainer>
  );
}

export default App;
