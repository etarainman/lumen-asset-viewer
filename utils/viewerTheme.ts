import * as THREE from 'three';
import { ViewerTheme } from '../context/ThemeContext';

export const VIEWER_PALETTES = {
  dark: {
    background: 0x020617,
    previewBackground: 0x0f172a,
    gridMajor: 0x1e293b,
    gridMinor: 0x0f172a,
    subGridMajor: 0x8a5a7a,
    subGridMinor: 0x4a2a3a
  },
  light: {
    background: 0xf8fafc,
    previewBackground: 0xf8fafc,
    gridMajor: 0x94a3b8,
    gridMinor: 0xe2e8f0,
    subGridMajor: 0x0ea5e9,
    subGridMinor: 0xbae6fd
  }
} as const satisfies Record<ViewerTheme, {
  background: number;
  previewBackground: number;
  gridMajor: number;
  gridMinor: number;
  subGridMajor: number;
  subGridMinor: number;
}>;

export const updateGridHelperColours = (
  grid: THREE.GridHelper,
  divisions: number,
  centreColour: number,
  gridColour: number
) => {
  const colourAttribute = grid.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!colourAttribute) return;

  const centre = new THREE.Color(centreColour);
  const regular = new THREE.Color(gridColour);
  const centreIndex = divisions / 2;

  for (let index = 0; index <= divisions; index++) {
    const colour = index === centreIndex ? centre : regular;
    for (let vertex = 0; vertex < 4; vertex++) {
      colourAttribute.setXYZ((index * 4) + vertex, colour.r, colour.g, colour.b);
    }
  }

  colourAttribute.needsUpdate = true;
};
