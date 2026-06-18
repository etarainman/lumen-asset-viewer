
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Status4D, Building, ViewLevel, BuildingDefinition, StatusDefinition, EquipmentDefinition, ColorMode, OwnerDefinition } from '../types';

export interface Viewer3DHandle {
  setCameraPreset: (preset: '3D' | 'PLAN' | 'ELEVATION' | 'ROW_A' | 'ROW_B') => void;
}

interface Viewer3DProps {
  viewLevel: ViewLevel;
  buildings: Building[];
  buildingDefs: BuildingDefinition[];
  activeBuildingId: string | null;
  selectedRackId: string | null;
  shellOpacity: number;
  statuses: StatusDefinition[];
  owners: OwnerDefinition[];
  colorMode: ColorMode;
  colorCodingEnabled: boolean;
  equipmentDefs?: EquipmentDefinition[];
  showLabels?: boolean;
  visibleStatuses?: Status4D[];
  onSelectRack?: (id: string | null) => void;
}

const Viewer3D = forwardRef<Viewer3DHandle, Viewer3DProps>(({
  viewLevel, buildings, buildingDefs, activeBuildingId,
  selectedRackId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled,
  equipmentDefs = [], showLabels = true, visibleStatuses = Object.values(Status4D), onSelectRack
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRackRef = useRef(onSelectRack);

  useEffect(() => {
    onSelectRackRef.current = onSelectRack;
  }, [onSelectRack]);

  const contextRef = useRef<{
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    frameId: number;
    active: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    setCameraPreset: (preset) => {
      if (!contextRef.current) return;
      const { camera, controls } = contextRef.current;
      controls.enabled = true;
      switch (preset) {
        case 'PLAN': 
          camera.position.set(0, 5000, 0); 
          controls.target.set(0, 0, 0); 
          break;
        case 'ELEVATION':
          camera.position.set(0, 500, 4000);
          controls.target.set(0, 500, 0);
          break;
        case '3D': 
        default: 
          camera.position.set(2500, 2000, 2500); 
          controls.target.set(0, 0, 0); 
          break;
      }
      controls.update();
    }
  }));

  const getObjectColor = (item: { status: string; ownerId: string }, fallback: string) => {
    if (!colorCodingEnabled) return fallback;
    if (colorMode === 'OWNER') {
      return owners.find(o => o.id === item.ownerId)?.color || fallback;
    }
    return statuses.find(s => s.id === item.status)?.color || fallback;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    
    // Default Camera initialized to 3D Preset Perspective
    const camera = new THREE.PerspectiveCamera(40, w / h, 1, 100000);
    camera.position.set(2500, 2000, 2500);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.className = 'css2d-renderer-root';
    containerRef.current.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    contextRef.current = { renderer, labelRenderer, scene, camera, controls, frameId: 0, active: true, raycaster, mouse };

    const animate = () => {
      if (!contextRef.current?.active) return;
      const ctx = contextRef.current;
      ctx.frameId = requestAnimationFrame(animate);
      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
      ctx.labelRenderer.render(ctx.scene, ctx.camera);
    };
    animate();

    const handleClick = (event: MouseEvent) => {
      if (!contextRef.current || !onSelectRackRef.current) return;
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);
      
      let rackFound = false;
      for (const intersect of intersects) {
        if (intersect.object.userData && typeof intersect.object.userData.rackId === 'string') {
          onSelectRackRef.current(intersect.object.userData.rackId);
          rackFound = true;
          break;
        }
      }
      if (!rackFound) onSelectRackRef.current(null);
    };

    renderer.domElement.addEventListener('click', handleClick);
    
    return () => { 
      if (contextRef.current) { 
        contextRef.current.active = false; 
        cancelAnimationFrame(contextRef.current.frameId); 
        if (labelRenderer.domElement.parentNode) {
            labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
        }
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.dispose();
      } 
    };
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    if (viewLevel === 'BUILDING' && activeBuildingId) {
       ctx.controls.target.set(0, 400, 0);
    } else {
       ctx.controls.target.set(0, 0, 0);
    }
    ctx.controls.update();
  }, [viewLevel, activeBuildingId]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    
    if (ctx.labelRenderer.domElement) {
      ctx.labelRenderer.domElement.innerHTML = '';
    }
    
    ctx.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
    ctx.scene.clear();
    
    const isBuildingView = viewLevel === 'BUILDING';

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(3000, 5000, 3000);
    sun.castShadow = true;
    ctx.scene.add(sun);

    ctx.scene.add(new THREE.GridHelper(20000, 40, 0x1e293b, 0x0f172a));

    const visibleBuildings = (isBuildingView && activeBuildingId) 
      ? buildings.filter(b => b.id === activeBuildingId)
      : buildings;

    visibleBuildings.forEach(b => {
      const def = buildingDefs.find(d => d.id === b.definitionId) || buildingDefs[0];
      const group = new THREE.Group();
      
      const activeB = buildings.find(x => x.id === activeBuildingId);
      const relX = isBuildingView ? (b.x - (activeB?.x || 0)) : b.x;
      const relZ = isBuildingView ? (b.z - (activeB?.z || 0)) : b.z;
      group.position.set(relX, 0, relZ);
      group.rotation.y = -(b.rotation || 0); 
      ctx.scene.add(group);

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
        const shape = parseSVGPath(def.svgPath || 'M -800,-600 L 800,-600 L 800,600 L -800,600 Z');
        const bHeight = def.height || 1100;

        // Base foundation
        const foundationExtrude = { depth: 60, bevelEnabled: false };
        const foundationGeo = new THREE.ExtrudeGeometry(shape, foundationExtrude);
        const foundationMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.rotation.x = Math.PI / 2;
        foundation.position.y = 60;
        foundation.raycast = () => {}; 
        group.add(foundation);

        // Building Shell (Glass Material)
        const extrudeSettings = { depth: bHeight, bevelEnabled: false };
        const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const resolvedBuildingColor = getObjectColor(b, def.color || '#d2c29d');
        const wallMat = new THREE.MeshStandardMaterial({ 
          color: resolvedBuildingColor, 
          transparent: shellOpacity < 1.0, 
          opacity: shellOpacity, 
          roughness: 0.2,
          metalness: 0.5,
          side: THREE.DoubleSide 
        });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.rotation.x = Math.PI / 2;
        walls.position.y = bHeight + 60;
        walls.raycast = () => {}; 
        group.add(walls);

        // Roof
        const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 100, bevelEnabled: false });
        const roofMat = new THREE.MeshStandardMaterial({ 
          color: def.roofColor || '#ffffff', 
          roughness: 0.2,
          transparent: shellOpacity < 0.2, 
          opacity: Math.max(shellOpacity * 1.5, 0.4) 
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.x = Math.PI / 2;
        roof.position.y = bHeight + 160;
        roof.scale.set(1.05, 1.05, 1); 
        roof.raycast = () => {};
        group.add(roof);

        // Racks
        const RACK_WIDTH = 60;
        const RACK_HEIGHT = 220;
        const RACK_DEPTH = 100;
        const TOTAL_U = 42;
        const U_STEP = RACK_HEIGHT / TOTAL_U;

        b.racks
          .filter(rack => visibleStatuses.includes(rack.status))
          .forEach(rack => {
            const resolvedRackColorStr = getObjectColor(rack, '#050505');
            const rackColor = parseInt(resolvedRackColorStr.replace('#', '0x'));
            const isSelected = rack.id === selectedRackId;
            
            const rackGroup = new THREE.Group();
            rackGroup.position.set(rack.x, 110 + 60, rack.y);
            rackGroup.rotation.y = rack.rotation || 0;
            group.add(rackGroup);

            // Shell
            const rackShellGeo = new THREE.BoxGeometry(RACK_WIDTH, RACK_HEIGHT, RACK_DEPTH);
            const rackShellMat = new THREE.MeshStandardMaterial({ color: 0x64748b, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.95 });
            const rackShell = new THREE.Mesh(rackShellGeo, rackShellMat);
            rackShell.userData = { rackId: rack.id };
            rackGroup.add(rackShell);

            // Skeleton
            const frameThickness = 5;
            const frameMat = new THREE.MeshStandardMaterial({ color: isSelected ? 0x3b82f6 : rackColor, roughness: 0.1, metalness: 0.9 });

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                const post = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, RACK_HEIGHT, frameThickness), frameMat);
                post.position.set(sx * (RACK_WIDTH/2), 0, sz * (RACK_DEPTH/2));
                rackGroup.add(post);
            });

            // --- Directional Arrow ---
            // Flipped 180 degrees: Points toward local -Z (Points AT the front of the rack face)
            const arrowShape = new THREE.Shape();
            arrowShape.moveTo(0, -15); // Tip (Pointing backwards in 2D)
            arrowShape.lineTo(10, 5);  // Base right
            arrowShape.lineTo(-10, 5); // Base left
            arrowShape.lineTo(0, -15);

            const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 2, bevelEnabled: false });
            const arrowMat = new THREE.MeshStandardMaterial({ 
              color: isSelected ? 0x3b82f6 : 0x10b981,
              emissive: isSelected ? 0x3b82f6 : 0x10b981,
              emissiveIntensity: 0.8,
              transparent: true,
              opacity: 0.9
            });
            const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
            arrowMesh.rotation.x = -Math.PI / 2;
            // Positioned at the bottom center, in front of the rack face
            arrowMesh.position.set(0, -RACK_HEIGHT / 2 + 2, RACK_DEPTH / 2 + 15);
            rackGroup.add(arrowMesh);

            // Equipment
            const rackEquipment = b.equipment.filter(e => e.rackId === rack.id);
            rackEquipment.forEach(eq => {
              const eqDef = equipmentDefs.find(d => d.id === eq.definitionId);
              const eqUHeight = eqDef?.heightU || 1;
              const eqHeight = eqUHeight * U_STEP;
              const resolvedEqColorStr = getObjectColor(eq, eqDef?.color || '#3b82f6');
              const eqColor = parseInt(resolvedEqColorStr.replace('#', '0x'));

              const eqGeo = new THREE.BoxGeometry(RACK_WIDTH - 8, eqHeight - 1, RACK_DEPTH - 10);
              const eqMat = new THREE.MeshStandardMaterial({ color: eqColor, roughness: 0.6, metalness: 0.3 });
              const eqMesh = new THREE.Mesh(eqGeo, eqMat);
              
              const yPos = - (RACK_HEIGHT / 2) + ((eq.baseRMU - 1) * U_STEP) + (eqHeight / 2);
              eqMesh.position.set(0, yPos, 0);
              rackGroup.add(eqMesh);
            });

            // Labels
            if (showLabels) {
              [1, 10, 20, 30, 42].forEach(u => {
                [-1, 1].forEach(side => {
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'text-[9px] font-black text-slate-500 font-mono';
                    labelDiv.textContent = `${u}U`;
                    const labelObj = new CSS2DObject(labelDiv);
                    const yPos = - (RACK_HEIGHT / 2) + ((u - 1) * U_STEP);
                    labelObj.position.set(side * ((RACK_WIDTH / 2) + 12), yPos, (RACK_DEPTH / 2));
                    rackGroup.add(labelObj);
                });
              });

              const labelDiv = document.createElement('div');
              labelDiv.className = 'building-label-3d';
              labelDiv.textContent = rack.label;
              if (isSelected) {
                labelDiv.style.borderColor = '#3b82f6';
                labelDiv.style.color = '#3b82f6';
                labelDiv.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
              }
              const labelObj = new CSS2DObject(labelDiv);
              labelObj.position.set(0, (RACK_HEIGHT / 2) + 30, 0); 
              rackGroup.add(labelObj);
            }
          });
      } catch (err) {
        console.error("Failed to render BIM Scene:", err);
      }
    });
  }, [buildings, buildingDefs, activeBuildingId, viewLevel, selectedRackId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled, equipmentDefs, showLabels, visibleStatuses]);

  return <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden" />;
});

export default Viewer3D;
