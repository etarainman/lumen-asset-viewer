
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BuildingDefinition } from '../types';

interface DefinitionPreview3DProps {
  definition: BuildingDefinition;
}

const DefinitionPreview3D: React.FC<DefinitionPreview3DProps> = ({ definition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    frameId: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 20000);
    camera.position.set(2000, 1500, 2000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    contextRef.current = { renderer, scene, camera, controls, frameId: 0, active: true };

    const animate = () => {
      if (!contextRef.current?.active) return;
      const ctx = contextRef.current;
      ctx.frameId = requestAnimationFrame(animate);
      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
    };
    animate();

    return () => {
      if (contextRef.current) {
        contextRef.current.active = false;
        cancelAnimationFrame(contextRef.current.frameId);
        renderer.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.scene.clear();

    // Lighting
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(1000, 2000, 1000);
    ctx.scene.add(sun);
    
    // Grid Helper
    const grid = new THREE.GridHelper(5000, 20, 0x1e293b, 0x0f172a);
    ctx.scene.add(grid);

    // BIM Extrusion
    const parseSVGPath = (path: string) => {
      const shape = new THREE.Shape();
      const commands = path.split(/(?=[LMCZ])/);
      commands.forEach(cmd => {
        const type = cmd[0];
        const args = cmd.slice(1).trim().split(/[ ,]+/).map(parseFloat);
        if (type === 'M') shape.moveTo(args[0], args[1]);
        else if (type === 'L') shape.lineTo(args[0], args[1]);
        else if (type === 'Z') shape.closePath();
      });
      return shape;
    };

    try {
      const shape = parseSVGPath(definition.svgPath || 'M -800,-600 L 800,-600 L 800,600 L -800,600 Z');
      const bHeight = definition.height || 1100;

      const group = new THREE.Group();
      ctx.scene.add(group);

      // Foundation
      const foundationExtrude = { depth: 60, bevelEnabled: false };
      const foundationGeo = new THREE.ExtrudeGeometry(shape, foundationExtrude);
      const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 1 });
      const foundation = new THREE.Mesh(foundationGeo, foundationMat);
      foundation.rotation.x = Math.PI / 2;
      foundation.position.y = 60;
      group.add(foundation);

      // Shell
      const extrudeSettings = { depth: bHeight, bevelEnabled: false };
      const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const wallMat = new THREE.MeshStandardMaterial({ 
        color: definition.color || '#d2c29d', 
        side: THREE.DoubleSide,
        roughness: 0.8
      });
      const walls = new THREE.Mesh(wallGeo, wallMat);
      walls.rotation.x = Math.PI / 2;
      walls.position.y = bHeight + 60;
      group.add(walls);

      // Roof
      const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 100, bevelEnabled: false });
      const roofMat = new THREE.MeshStandardMaterial({ color: definition.roofColor || '#ffffff', roughness: 0.2 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.x = Math.PI / 2;
      roof.position.y = bHeight + 160;
      roof.scale.set(1.05, 1.05, 1);
      group.add(roof);

      // CAD Outlines for preview clarity
      const edgeColor = new THREE.Color(0x000000);
      const wallEdges = new THREE.EdgesGeometry(wallGeo);
      const wallLines = new THREE.LineSegments(wallEdges, new THREE.LineBasicMaterial({ color: edgeColor, opacity: 0.3, transparent: true }));
      wallLines.rotation.copy(walls.rotation);
      wallLines.position.copy(walls.position);
      group.add(wallLines);

      // Center the camera on the bounding box of the preview
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      ctx.controls.target.copy(center);
      ctx.controls.update();

    } catch (err) {
      console.error("Failed to render preview:", err);
    }
  }, [definition]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default DefinitionPreview3D;
