import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Status4D, Building, ViewLevel, BuildingDefinition, StatusDefinition, EquipmentDefinition, ColorMode, OwnerDefinition, RackDefinition } from '../types';

export interface Viewer3DHandle {
  setCameraPreset: (preset: '3D' | 'PLAN' | 'ELEVATION' | 'ROW_A' | 'ROW_B') => void;
}

interface Viewer3DProps {
  viewLevel: ViewLevel;
  buildings: Building[];
  buildingDefs: BuildingDefinition[];
  activeBuildingId: string | null;
  selectedRackId: string | null;
  selectedEquipmentId: string | null;
  shellOpacity: number;
  statuses: StatusDefinition[];
  owners: OwnerDefinition[];
  colorMode: ColorMode;
  colorCodingEnabled: boolean;
  rackDefs: RackDefinition[];
  equipmentDefs?: EquipmentDefinition[];
  showLabels?: boolean;
  visibleStatuses?: Status4D[];
  onSelectRack?: (id: string | null) => void;
  onSelectEquipment?: (id: string | null) => void;
}

const Viewer3D = forwardRef<Viewer3DHandle, Viewer3DProps>(({
  viewLevel, buildings, buildingDefs, activeBuildingId,
  selectedRackId, selectedEquipmentId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled,
  rackDefs, equipmentDefs = [], showLabels = true, visibleStatuses = Object.values(Status4D), onSelectRack, onSelectEquipment
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRackRef = useRef(onSelectRack);
  const onSelectEquipmentRef = useRef(onSelectEquipment);

  useEffect(() => {
    onSelectRackRef.current = onSelectRack;
  }, [onSelectRack]);

  useEffect(() => {
    onSelectEquipmentRef.current = onSelectEquipment;
  }, [onSelectEquipment]);

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
          camera.position.set(0, 50, 0);
          controls.target.set(0, 0, 0);
          break;
        case 'ELEVATION':
          camera.position.set(0, 5, 40);
          controls.target.set(0, 5, 0);
          break;
        case '3D':
        default:
          camera.position.set(25, 20, 25);
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
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 10000);
    camera.position.set(25, 20, 25);

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
      if (!event.ctrlKey) return; // Only select on CTRL+LMB
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);

      let bestEq = null;
      let bestRack = null;

      for (const intersect of intersects) {
        const ud = intersect.object.userData;
        if (!bestEq && ud?.eqId) {
          bestEq = ud.eqId;
          break; // Prioritize equipment if any is hit
        }
        if (!bestRack && ud?.rackId) {
          bestRack = ud.rackId;
        }
      }

      if (bestEq) {
        if (onSelectEquipmentRef.current) onSelectEquipmentRef.current(bestEq);
        if (onSelectRackRef.current) onSelectRackRef.current(null);
      } else if (bestRack) {
        if (onSelectRackRef.current) onSelectRackRef.current(bestRack);
        if (onSelectEquipmentRef.current) onSelectEquipmentRef.current(null);
      } else {
        if (onSelectRackRef.current) onSelectRackRef.current(null);
        if (onSelectEquipmentRef.current) onSelectEquipmentRef.current(null);
      }
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
      ctx.controls.target.set(0, 4, 0);
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
    sun.position.set(30, 50, 30);
    sun.castShadow = true;
    ctx.scene.add(sun);

    const grid = new THREE.GridHelper(100, 100, 0x1e293b, 0x0f172a);
    grid.position.y = 0.01; // Sit slightly above foundation top at 0
    ctx.scene.add(grid);

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
        const shape = parseSVGPath(def.svgPath || 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z');
        const bHeight = def.height || 10;

        // Base foundation
        const foundationExtrude = { depth: 0.6, bevelEnabled: false };
        const foundationGeo = new THREE.ExtrudeGeometry(shape, foundationExtrude);
        const foundationMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.rotation.x = Math.PI / 2;
        foundation.position.y = 0; // Top is at 0, bottom is at -0.6
        foundation.raycast = () => { };
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
        walls.position.y = bHeight; // Top is at bHeight, bottom at 0
        walls.raycast = () => { };
        group.add(walls);

        // Roof
        const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
        const roofMat = new THREE.MeshStandardMaterial({
          color: def.roofColor || '#ffffff',
          roughness: 0.2,
          transparent: shellOpacity < 0.2,
          opacity: Math.max(shellOpacity * 1.5, 0.4)
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.x = Math.PI / 2;
        roof.position.y = bHeight + 1.0; // Sits on top of walls
        roof.scale.set(1.05, 1.05, 1);
        roof.raycast = () => { };
        group.add(roof);

        b.racks
          .filter(rack => visibleStatuses.includes(rack.status))
          .forEach(rack => {
            const rDef = rackDefs?.find(rd => rd.id === rack.definitionId) || rackDefs?.[0] || { width: 2.0, height: 6.5, depth: 3.0, totalU: 42 };
            const rWidth = rDef.width || 2.0;
            const rHeight = Math.min(25, rDef.height || 6.5);
            const rDepth = rDef.depth || 3.0;
            const rU = Math.max(1, rDef.totalU || 42);
            const rUStep = rHeight / rU;

            const resolvedRackColorStr = getObjectColor(rack, '#050505');
            const rackColor = parseInt(resolvedRackColorStr.replace('#', '0x'));
            const isSelected = rack.id === selectedRackId;

            const rackGroup = new THREE.Group();
            rackGroup.position.set(rack.x, 0, rack.y); // Grounded
            rackGroup.rotation.y = rack.rotation || 0;
            group.add(rackGroup);

            // Shell
            const rackShellGeo = new THREE.BoxGeometry(rWidth, rHeight, rDepth);
            const rackShellMat = new THREE.MeshStandardMaterial({ color: 0x64748b, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.95 });
            const rackShell = new THREE.Mesh(rackShellGeo, rackShellMat);
            rackShell.position.y = rHeight / 2;
            rackShell.userData = { rackId: rack.id };
            rackGroup.add(rackShell);

            // Skeleton
            const frameThickness = isSelected ? 0.08 : 0.05;
            const frameMat = new THREE.MeshStandardMaterial({
              color: isSelected ? 0x3b82f6 : rackColor,
              roughness: 0.1,
              metalness: 0.9,
              emissive: isSelected ? 0x3b82f6 : 0x000000,
              emissiveIntensity: isSelected ? 0.5 : 0
            });

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
              const post = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, rHeight, frameThickness), frameMat);
              post.position.set(sx * (rWidth / 2 - frameThickness / 2), rHeight / 2, sz * (rDepth / 2 - frameThickness / 2));
              rackGroup.add(post);
            });

            // --- Directional Arrow (On Top Front Edge) ---
            const arrowShape = new THREE.Shape();
            arrowShape.moveTo(0, -0.4);
            arrowShape.lineTo(0.3, 0.2);
            arrowShape.lineTo(-0.3, 0.2);
            arrowShape.lineTo(0, -0.4);

            const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.1, bevelEnabled: false });
            const arrowMat = new THREE.MeshStandardMaterial({
              color: isSelected ? 0x3b82f6 : 0x10b981,
              emissive: isSelected ? 0x3b82f6 : 0x10b981,
              emissiveIntensity: 1.0,
              transparent: false,
              depthTest: true
            });
            const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);

            // Pointing Forward (Towards +Z relative to rack)
            arrowMesh.rotation.x = -Math.PI / 2;
            // Position on top of rack, at the very front edge (+Z/2)
            arrowMesh.position.set(0, (rHeight / 2) + 0.15, (rDepth / 2) - 0.2);
            rackGroup.add(arrowMesh);

            // Equipment
            const rackEquipment = b.equipment.filter(e => e.rackId === rack.id);
            rackEquipment.forEach(eq => {
              const eqDef = equipmentDefs.find(d => d.id === eq.definitionId);
              const eqUHeight = eqDef?.heightU || 1;
              const eqHeight = eqUHeight * rUStep;
              const eqDepth = eqDef?.depth || (rDepth - 0.2); // Use defined depth or fallback
              const eqWidth = rWidth - 0.1; // Equipment fills most of rack width

              const resolvedEqColorStr = getObjectColor(eq, eqDef?.color || '#3b82f6');
              const eqColor = parseInt(resolvedEqColorStr.replace('#', '0x'));

              const isEqSelected = eq.id === selectedEquipmentId;

              const eqGeo = new THREE.BoxGeometry(eqWidth, eqHeight - 0.02, eqDepth);
              const eqMat = new THREE.MeshStandardMaterial({
                color: isEqSelected ? 0x3b82f6 : eqColor,
                roughness: 0.6,
                metalness: 0.3,
                emissive: isEqSelected ? 0x3b82f6 : 0x000000,
                emissiveIntensity: isEqSelected ? 0.8 : 0
              });
              const eqMesh = new THREE.Mesh(eqGeo, eqMat);
              eqMesh.userData = { eqId: eq.id };

              const yPos = ((eq.baseRMU - 1) * rUStep) + (eqHeight / 2);
              // Position inside rack
              eqMesh.position.set(0, yPos, 0);
              rackGroup.add(eqMesh);

              if (isEqSelected) {
                const wireMeta = new THREE.EdgesGeometry(eqGeo);
                const wireMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
                const wireframe = new THREE.LineSegments(wireMeta, wireMat);
                wireframe.position.copy(eqMesh.position);
                rackGroup.add(wireframe);
              }
            });

            // Labels - MUST stay inside the rack loop
            if (showLabels) {
              // Generate labels every 2U
              const labelIncrements = [];
              for (let u = 1; u <= rU; u += 2) {
                labelIncrements.push(u);
              }
              // Always include the top U if not already included
              if (!labelIncrements.includes(rU)) {
                labelIncrements.push(rU);
              }

              labelIncrements.forEach(u => {
                [-1, 1].forEach(side => {
                  const labelDiv = document.createElement('div');
                  labelDiv.className = `text-[13px] font-black font-mono transition-all ${isSelected ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-slate-400'}`;
                  labelDiv.textContent = `${u}`;
                  const labelObj = new CSS2DObject(labelDiv);
                  const yPos = ((u - 1) * rUStep);
                  // Position very close to the rack's front face
                  labelObj.position.set(side * (rWidth / 2 - 0.15), yPos, (rDepth / 2) + 0.05);
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
              labelObj.position.set(0, rHeight + 1, 0);
              rackGroup.add(labelObj);
            }
          });
      } catch (err) {
        console.error("Failed to render BIM Scene:", err);
      }
    });
  }, [buildings, buildingDefs, activeBuildingId, viewLevel, selectedRackId, selectedEquipmentId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled, rackDefs, equipmentDefs, showLabels, visibleStatuses]);

  return <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden" />;
});

export default Viewer3D;
