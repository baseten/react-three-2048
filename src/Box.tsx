import React, {
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferAttribute,
  DynamicDrawUsage,
  Mesh,
  Texture,
  ShaderLib,
  ShaderMaterial,
  Color,
  Vector3,
} from 'three';
import { mergeUniforms } from 'three/src/renderers/shaders/UniformsUtils';
import gsap from 'gsap';

import { BOX_COLORS } from './consts';
import { vertexShader, fragmentShader } from './boxShader';
import sheetData from './2048-sheet.json';
import { Phase } from './types';
import { buildUVinRange } from './utils';

type BoxProps = {
  phase: Phase;
  texture: Texture;
  value: number;
  position: Vector3;
  isNew: boolean;
  isMerged: boolean;
  onAnimationComplete: () => void;
};

const FRAME_SIZE = sheetData.frames['1'].frame.w;
const SHEET_SIZE = sheetData.meta.size.w;
const UV_SIZE = FRAME_SIZE / SHEET_SIZE;

type MeshRefType = RefObject<Mesh>;
type GeometryRefType = RefObject<BoxGeometry>;
type MaterialRefType = RefObject<ShaderMaterial>;

const useShader = (texture: Texture) => {
  const material: MaterialRefType = useRef(null);
  const shaderData = useMemo(() => {
    const data = {
      defines: {
        USE_MAP: '',
        USE_UV: '',
      },
      uniforms: mergeUniforms([
        ShaderLib.lambert.uniforms,
        { fontColor: { value: new Color(0xffffff) } },
        { time: { value: 0 } },
        { centre: { value: new Vector3() } },
      ]),
      vertexShader,
      fragmentShader,
      lights: true,
    };

    data.uniforms.map.value = texture;

    return data;
  }, [texture]);

  useFrame((_, delta) => {
    if (!material.current) {
      return;
    }
    material.current.uniforms.time.value += delta;
  });

  return { material, shaderData };
};

const useUpdateValueTextureCoords = (
  value: number,
  texture: Texture,
  geometry: GeometryRefType,
  material: MaterialRefType,
) => {
  useEffect(() => {
    const geometryInstance = geometry.current;
    const materialInstance = material.current;

    if (!geometryInstance || !materialInstance) {
      return;
    }

    // @ts-ignore
    const { frame } = sheetData.frames[value];
    const uMin = frame.x / SHEET_SIZE;
    const uMax = uMin + UV_SIZE;
    // v direction is inverted:
    const vMax = 1 - frame.y / SHEET_SIZE;
    const vMin = vMax - UV_SIZE;

    const { widthSegments, depthSegments, heightSegments } =
      geometryInstance.parameters;
    const uvAttr = geometryInstance.getAttribute('uv') as BufferAttribute;
    const nextUvs = buildUVinRange(
      uMin,
      uMax,
      vMin,
      vMax,
      widthSegments,
      depthSegments,
      heightSegments,
    );
    uvAttr.set(nextUvs);
    uvAttr.setUsage(DynamicDrawUsage);
    uvAttr.needsUpdate = true;

    material.current.uniforms.fontColor.value.set(BOX_COLORS[value].color);
  }, [geometry, material, texture, value]);
};

const useSpawnAnimation = (
  isNew: boolean,
  position: Vector3,
  value: number,
  phase: Phase,
  mesh: MeshRefType,
  material: MaterialRefType,
  onAnimationComplete: () => void,
) => {
  const { x, y } = position;

  useEffect(() => {
    if (
      !mesh.current ||
      !material.current ||
      !isNew ||
      !['SPAWN', 'INIT'].includes(phase)
    ) {
      return;
    }

    const { color, background } = BOX_COLORS[value];

    mesh.current.position.x = x;
    mesh.current.position.y = y;

    material.current.uniforms.centre.value.set(x, y, 0);
    material.current.uniforms.fontColor.value.set(color);
    material.current.uniforms.diffuse.value.set(background);

    const ctx = gsap.context(() => {
      if (!mesh.current) {
        return;
      }

      gsap.fromTo(
        mesh.current.scale,
        {
          x: 0.01,
          y: 0.01,
        },
        {
          duration: 0.333,
          x: 1,
          y: 1,
          ease: 'Back.easeOut',
          onComplete: onAnimationComplete,
        },
      );
    });
    return () => {
      ctx.kill();
    };
  }, [phase, value, isNew, x, y, onAnimationComplete, mesh, material]);
};

const useUpdateAnimation = (
  isMerged: boolean,
  position: Vector3,
  value: number,
  phase: Phase,
  mesh: MeshRefType,
  material: MaterialRefType,
  onAnimationComplete: () => void,
) => {
  const meshPositionTweenState: RefObject<{
    tweenPosition: number;
    fromPosition: Vector3;
  }> = useRef({
    fromPosition: position.clone(),
    tweenPosition: 0,
  });
  const materialColorTweenState: RefObject<{
    tweenPosition: number;
    fromColor: string;
  }> = useRef({
    fromColor: BOX_COLORS[value].background,
    tweenPosition: 0,
  });
  const { x, y } = position;

  return useLayoutEffect(() => {
    if (
      !mesh.current ||
      !material.current ||
      !materialColorTweenState.current ||
      phase !== 'ACTIVE'
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      if (!mesh.current) {
        return;
      }

      const timeline = gsap
        .timeline({ onComplete: onAnimationComplete })
        .fromTo(
          meshPositionTweenState.current,
          {
            tweenPosition: 0,
          },
          {
            duration: 0.333,
            tweenPosition: 1,
            ease: 'Power3.inOut',
            onUpdate: () => {
              if (
                !meshPositionTweenState.current ||
                !mesh.current ||
                !material.current
              ) {
                return;
              }

              const { fromPosition, tweenPosition } =
                meshPositionTweenState.current;

              mesh.current.position.lerpVectors(
                fromPosition,
                position,
                tweenPosition,
              );
              material.current.uniforms.centre.value.copy(
                mesh.current.position,
              );
            },
            onComplete: () => {
              if (!meshPositionTweenState.current) {
                return;
              }

              meshPositionTweenState.current.fromPosition.copy(position);
            },
          },
        )
        .fromTo(
          materialColorTweenState.current,
          {
            tweenPosition: 0,
          },
          {
            duration: 0.333,
            tweenPosition: 1,
            ease: 'linear',
            onUpdate: () => {
              if (!materialColorTweenState.current || !material.current) {
                return;
              }

              const { fromColor, tweenPosition } =
                materialColorTweenState.current;

              material.current.uniforms.diffuse.value.set(
                gsap.utils.interpolate(
                  fromColor,
                  BOX_COLORS[value].background,
                  tweenPosition,
                ),
              );
            },
            onComplete: () => {
              if (!materialColorTweenState.current) {
                return;
              }

              materialColorTweenState.current.fromColor =
                BOX_COLORS[value].background;
            },
          },
          '<',
        );

      if (isMerged) {
        timeline.to(
          mesh.current.scale,
          {
            duration: 0.15,
            x: 0.01,
            y: 0.01,
            ease: 'Power3.inOut',
          },
          '>-0.15',
        );
      }
    });

    return () => {
      ctx.kill();
    };
  }, [phase, isMerged, value, x, y, onAnimationComplete, position, mesh, material]);
};

export default function Box({
  phase,
  value,
  texture,
  position,
  isNew,
  isMerged,
  onAnimationComplete,
}: BoxProps) {
  const mesh: MeshRefType = useRef(null);
  const geometry: GeometryRefType = useRef(null);

  const { shaderData, material } = useShader(texture);

  useUpdateValueTextureCoords(value, texture, geometry, material);

  useSpawnAnimation(
    isNew,
    position,
    value,
    phase,
    mesh,
    material,
    onAnimationComplete,
  );

  useUpdateAnimation(
    isMerged,
    position,
    value,
    phase,
    mesh,
    material,
    onAnimationComplete,
  );

  return (
    <mesh ref={mesh}>
      <boxGeometry ref={geometry} args={[1, 1, 1]} />
      <shaderMaterial ref={material} {...shaderData} />
    </mesh>
  );
}
