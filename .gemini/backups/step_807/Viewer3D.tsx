import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Status4D, Building, ViewLevel, BuildingDefinition, StatusDefinition, EquipmentDefinition, ColorMode, OwnerDefinition, RackDefinition } from '../types';

export interface Viewer3DHandle {
  setCameraPreset: (preset: '3D' | 'PLAN' | 'ELEVATION' | 'ROW_A' | 'ROW_B', lineup?: string) => void;
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
  showRackLabels?: boolean;
  showRMULabels?: boolean;
  showRoof?: boolean;
  showSuites?: boolean;
  visibleStatuses?: Status4D[];
  onSelectRack?: (id: string | null) => void;
  onSelectEquipment?: (id: string | null) => void;
  focusTrigger?: number;
}

const Viewer3D = forwardRef<Viewer3DHandle, Viewer3DProps>(({
  viewLevel, buildings, buildingDefs, activeBuildingId,
  selectedRackId, selectedEquipmentId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled,
  rackDefs, equipmentDefs = [], showRackLabels = true, showRMULabels = true, showRoof = true, showSuites = true, visibleStatuses = Object.values(Status4D), onSelectRack, onSelectEquipment, focusTrigger = 0
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

  // Keyboard controls state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isUserInteractionRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const contextRef = useRef<{
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    scene: THREE.Scene;
    perspectiveCamera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    activeCamera: THREE.Camera;
    controls: OrbitControls;
    frameId: number;
    active: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  // Helper to get active camera
  const getActiveCamera = () => {
    return contextRef.current?.activeCamera || contextRef.current?.perspectiveCamera;
  };

  useImperativeHandle(ref, () => ({
    setCameraPreset: (preset, explicitLineup) => {
      const ctx = contextRef.current;
      if (!ctx || !ctx.activeCamera) return;

      const { perspectiveCamera, orthoCamera, controls } = ctx;
      const isOrtho = preset === 'PLAN' || preset === 'ELEVATION';

      let targetLineup = explicitLineup || '001';

      // Switch Camera
      ctx.activeCamera = isOrtho ? orthoCamera : perspectiveCamera;
      controls.object = ctx.activeCamera;

      // Reset Clipping
      ctx.renderer.clippingPlanes = [];

      if (preset === 'PLAN') {
        // Top Down Ortho
        // 1. Lock Controls to Top-Down
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = 0;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;

        orthoCamera.position.set(0, 9, 0);
        orthoCamera.rotation.set(-Math.PI / 2, 0, 0);
        orthoCamera.zoom = 5;
        orthoCamera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.enableRotate = false;
      } else if (preset === 'ELEVATION') {
        // Side/Front View
        // 1. Lock Controls to Horizon (90 degrees)
        controls.minPolarAngle = Math.PI / 2;
        controls.maxPolarAngle = Math.PI / 2;

        // Find lineup
        let targetRacks = [];
        const activeB = buildings.find(b => b.id === activeBuildingId);
        if (activeB) {
          // If no explicit lineup, try to infer from selection, else default
          if (!explicitLineup) {
            const selectedRack = activeB.racks.find(r => r.id === selectedRackId);
            targetLineup = selectedRack?.lineUp || activeB.racks[0]?.lineUp || '001';
          }

          if (targetLineup) {
            targetRacks = activeB.racks.filter(r => r.lineUp === targetLineup);
          }
        }

        if (targetRacks.length > 0) {
          // Calculate bounds
          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
          targetRacks.forEach(r => {
            minX = Math.min(minX, r.x);
            maxX = Math.max(maxX, r.x);
            minZ = Math.min(minZ, r.y);
            maxZ = Math.max(maxZ, r.y);
          });

          const cenX = (minX + maxX) / 2;
          const cenZ = (minZ + maxZ) / 2;
          const spanX = maxX - minX;
          const spanZ = maxZ - minZ;

          // Determine Orientation based on average rack rotation
          // This ensures we face the "Front" of the racks
          let avgRot = 0;
          targetRacks.forEach(r => avgRot += (r.rotation || 0));
          avgRot /= targetRacks.length;

          // Normalize to 0-2PI
          avgRot = (avgRot % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

          // Snap to nearest 90 (0, PI/2, PI, 3PI/2)
          const step = Math.PI / 2;
          const snapRot = Math.round(avgRot / step) * step;

          const dist = 50;
          let camX = cenX;
          let camZ = cenZ;
          let azimuth = 0;

          // Simplify: Just look AT the face of the racks based on Rotation.
          // Assuming Green Arrow (Rotation) points "Out" from the rack.
          // We want to look against the arrow (At the face). (Camera is opposite to rotation vector)

          if (Math.abs(snapRot - 0) < 0.1 || Math.abs(snapRot - Math.PI * 2) < 0.1) {
            // Rotation 0 (Face +Z). Cam at +Z looking -Z.
            camZ = cenZ + 50;
            azimuth = 0;
          } else if (Math.abs(snapRot - Math.PI / 2) < 0.1) {
            // Rotation 90 (Face +X). Cam at +X looking -X.
            camX = cenX + 50;
            azimuth = Math.PI / 2;
          } else if (Math.abs(snapRot - Math.PI) < 0.1) {
            // Rotation 180 (Face -Z). Cam at -Z looking +Z.
            camZ = cenZ - 50;
            azimuth = Math.PI;
          } else {
            // Rotation 270 (Face -X). Cam at -X looking +X.
            camX = cenX - 50;
            azimuth = -Math.PI / 2;
          }

          // Lock Azimuth
          controls.minAzimuthAngle = azimuth;
          controls.maxAzimuthAngle = azimuth;

          orthoCamera.position.set(camX, 5, camZ);
          orthoCamera.lookAt(cenX, 5, cenZ);

          // Auto-Fit Zoom
          const maxDim = Math.max(spanX, spanZ, 8);
          const margin = 1.1;
          const frustumSize = 40;
          const fitZoom = frustumSize / (maxDim * margin);
          orthoCamera.zoom = Math.max(fitZoom, 0.5);
          orthoCamera.updateProjectionMatrix();

          controls.target.set(cenX, 5, cenZ);
          controls.enableRotate = false;
        } else {
          // Fallback
          controls.minPolarAngle = Math.PI / 2;
          controls.maxPolarAngle = Math.PI / 2;
          orthoCamera.position.set(0, 5, 20);
          orthoCamera.lookAt(0, 5, 0);
          orthoCamera.zoom = 1;
          orthoCamera.updateProjectionMatrix();
          controls.target.set(0, 5, 0);
          controls.enableRotate = false;
        }

      } else {
        // 3D Perspective
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI; // Full freedom
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;

        controls.enableRotate = true;
        perspectiveCamera.position.set(25, 20, 25);
        controls.target.set(0, 0, 0);
      }
      // Visibility Filtering for Elevation Mode
      ctx.scene.traverse((obj) => {
        // Only modify Rack Groups (identified by active userData.type or basic rackId)
        if (obj.userData && obj.userData.type === 'RACK_GROUP') {
          if (preset === 'ELEVATION') {
            // In Elevation, only show Target Lineup
            const lineUpMatch = obj.userData.lineUp === targetLineup;
            obj.visible = lineUpMatch;
          } else {
            // In 3D/Plan, show all
            obj.visible = true;
          }
        }
      });

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

    // Initialize both cameras
    const perspectiveCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 10000);
    perspectiveCamera.position.set(25, 20, 25);

    const aspect = w / h;
    const frustumSize = 40;
    const orthoCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1, // Near plane close to 0 but positive
      1000
    );
    orthoCamera.position.set(0, 50, 0); // Default high up

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true; // Enable clipping
    containerRef.current.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.className = 'css2d-renderer-root';
    containerRef.current.appendChild(labelRenderer.domElement);

    // Default to Perspective
    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    contextRef.current = {
      renderer,
      labelRenderer,
      scene,
      perspectiveCamera,
      orthoCamera,
      activeCamera: perspectiveCamera,
      controls,
      frameId: 0,
      active: true,
      raycaster,
      mouse
    };

    const animate = () => {
      if (!contextRef.current?.active) return;
      const ctx = contextRef.current;
      ctx.frameId = requestAnimationFrame(animate);

      const activeCam = ctx.activeCamera;

      // Keyboard Navigation (WASD + QE) - Only for Perspective mostly, or Ortho Pan
      if (ctx.controls.enabled && activeCam === ctx.perspectiveCamera) {
        // ... (Existing WASD logic) ... 
        // NOTE: Kept existing logic but applied to activeCam variable if needed, 
        // but relying on existing shared WASD block logic below which references ctx.camera (need to update that block)
      }

      // Update: Unified WASD logic for active camera
      if (ctx.controls.enabled) {
        const speed = 0.5;
        const lookDir = new THREE.Vector3();
        activeCam.getWorldDirection(lookDir);
        lookDir.y = 0;
        lookDir.normalize();

        const rightDir = new THREE.Vector3();
        rightDir.crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();

        let moveX = 0; let moveZ = 0; let moveY = 0;

        if (keysPressed.current['w']) { moveX += lookDir.x; moveZ += lookDir.z; }
        if (keysPressed.current['s']) { moveX -= lookDir.x; moveZ -= lookDir.z; }
        if (keysPressed.current['a']) { moveX -= rightDir.x; moveZ -= rightDir.z; }
        if (keysPressed.current['d']) { moveX += rightDir.x; moveZ += rightDir.z; }
        if (keysPressed.current['q']) { moveY -= 1; }
        if (keysPressed.current['e']) { moveY += 1; }

        if (moveX !== 0 || moveZ !== 0 || moveY !== 0) {
          activeCam.position.x += moveX * speed;
          activeCam.position.z += moveZ * speed;
          activeCam.position.y += moveY * speed;
          ctx.controls.target.x += moveX * speed;
          ctx.controls.target.z += moveZ * speed;
          ctx.controls.target.y += moveY * speed;
        }
      }

      ctx.controls.update();
      ctx.renderer.render(ctx.scene, activeCam);
      ctx.labelRenderer.render(ctx.scene, activeCam);
    };
    animate();

    const handleClick = (event: MouseEvent) => {
      if (!contextRef.current || !onSelectRackRef.current) return;
      if (!event.ctrlKey) return;
      isUserInteractionRef.current = true;
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      ctx.raycaster.setFromCamera(ctx.mouse, ctx.activeCamera); // Use active Camera
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);

      // ... (Rest of click handler remains same) ...
      let bestEq = null;
      let bestRack = null;

      for (const intersect of intersects) {
        const ud = intersect.object.userData;
        if (!bestEq && ud?.eqId) {
          bestEq = ud.eqId;
          break;
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

    const handleDoubleClick = (event: MouseEvent) => {
      if (!contextRef.current) return;
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      ctx.raycaster.setFromCamera(ctx.mouse, ctx.activeCamera);
      // Intersect everything (Racks, Eq, FloorPlane)
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);

      if (intersects.length > 0) {
        // Find the first valid hit (Mesh)
        // We might hit GridHelper lines, which is fine, or floor plane.
        const hit = intersects.find(i => (i.object instanceof THREE.Mesh) || (i.object instanceof THREE.Line));

        if (hit) {
          // Move Camera Target to this point
          ctx.controls.target.copy(hit.point);

          // Zoom In Logic
          if ((ctx.activeCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            // Perspective: Move physically closer
            const cam = ctx.activeCamera;
            const direction = new THREE.Vector3().subVectors(cam.position, hit.point).normalize();
            // Stop at distance 0.625 from target (Extreme Close-up)
            const closeDist = 0.625;
            cam.position.copy(hit.point).add(direction.multiplyScalar(closeDist));
          } else {
            // Orthographic: Increase Zoom factor
            const cam = ctx.activeCamera as THREE.OrthographicCamera;
            cam.zoom = 240; // Extreme zoom level
            cam.updateProjectionMatrix();
          }

          ctx.controls.update();
        }
      }
    };
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    return () => {
      if (contextRef.current) {
        contextRef.current.active = false;
        cancelAnimationFrame(contextRef.current.frameId);
        if (labelRenderer.domElement.parentNode) {
          labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
        }
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
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

  // Camera focus on selection
  const lastSelectedRef = useRef<{ r: string | null; e: string | null }>({ r: null, e: null });

  useEffect(() => {
    const prev = lastSelectedRef.current;
    const rackChanged = selectedRackId !== prev.r;
    const eqChanged = selectedEquipmentId !== prev.e;

    if ((rackChanged && selectedRackId) || (eqChanged && selectedEquipmentId)) {
      if (!contextRef.current || !activeBuildingId) {
        lastSelectedRef.current = { r: selectedRackId, e: selectedEquipmentId };
        return;
      }
      const activeB = buildings.find(b => b.id === activeBuildingId);
      if (!activeB) {
        lastSelectedRef.current = { r: selectedRackId, e: selectedEquipmentId };
        return;
      }

      if (isUserInteractionRef.current) {
        isUserInteractionRef.current = false;
        lastSelectedRef.current = { r: selectedRackId, e: selectedEquipmentId };
        return;
      }
    }
    lastSelectedRef.current = { r: selectedRackId, e: selectedEquipmentId };
  }, [selectedRackId, selectedEquipmentId, activeBuildingId, buildings, rackDefs, equipmentDefs]);

  // Focus Trigger Effect
  useEffect(() => {
    if (focusTrigger === 0) return; // Ignore initial mount
    if (!contextRef.current || !activeBuildingId) return;
    const activeB = buildings.find(b => b.id === activeBuildingId);
    if (!activeB) return;
    const ctx = contextRef.current;

    let target: THREE.Vector3 | null = null;
    let rotation = 0;

    if (selectedEquipmentId) {
      const eq = activeB.equipment.find(e => e.id === selectedEquipmentId);
      if (eq) {
        const rack = activeB.racks.find(r => r.id === eq.rackId);
        if (rack) {
          rotation = rack.rotation || 0;
          const rDef = rackDefs?.find(rd => rd.id === rack.definitionId) || rackDefs?.[0] || { height: 6.5, totalU: 42 };
          const rHeight = Math.min(25, rDef.height || 6.5);
          const rU = Math.max(1, rDef.totalU || 42);
          const uStep = rHeight / rU;

          const eqDef = equipmentDefs.find(d => d.id === eq.definitionId);
          const eqH = (eqDef?.heightU || 1) * uStep;

          const yPos = ((eq.baseRMU - 1) * uStep) + (eqH / 2);
          target = new THREE.Vector3(rack.x, yPos, rack.y);
        }
      }
    } else if (selectedRackId) {
      const rack = activeB.racks.find(r => r.id === selectedRackId);
      if (rack) {
        rotation = rack.rotation || 0;
        const rDef = rackDefs?.find(rd => rd.id === rack.definitionId) || rackDefs?.[0] || { height: 6.5 };
        const h = Math.min(25, rDef.height || 6.5);
        target = new THREE.Vector3(rack.x, h / 2, rack.y);
      }
    }

    if (target) {
      ctx.controls.target.copy(target);

      // Move Camera to "Front" and Close
      const dist = 5.0; // Close distance
      const offset = new THREE.Vector3(0, 0, dist);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

      const camPos = target.clone().add(offset);
      // Ensure camera is slightly higher than target or level? Level is fine. 
      // Maybe ensure Y is at least target.y?

      const activeCam = ctx.activeCamera;
      if ((activeCam as THREE.PerspectiveCamera).isPerspectiveCamera) {
        activeCam.position.copy(camPos);
        activeCam.lookAt(target);
      } else {
        // Ortho: Just center logic? Or try to rotate?
        // Ortho is locked usually. Just pan.
        const cam = activeCam as THREE.OrthographicCamera;
        cam.position.set(camPos.x, target.y, camPos.z); // Cannot really rotate Ortho easily if locked?
        // Assuming Ortho is top-down usually? 
        // If user is in Elevation (Side?)
        // For now, Perspective is main view.
      }

      ctx.controls.update();
    }

  }, [focusTrigger, selectedRackId, selectedEquipmentId, activeBuildingId, buildings, rackDefs, equipmentDefs]);

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

    // Main grid - 1 foot intervals
    const grid = new THREE.GridHelper(100, 100, 0x1e293b, 0x0f172a);
    grid.position.y = 0.01; // Sit slightly above foundation top at 0
    ctx.scene.add(grid);

    // Sub-grid - quarter foot (3 inch) intervals with lighter solid lines
    const subGrid = new THREE.GridHelper(100, 400, 0x8a5a7a, 0x4a2a3a);
    subGrid.position.y = 0.02; // Slightly above main grid

    // Make sub-grid more subtle with transparency
    if (subGrid.material instanceof THREE.Material) {
      subGrid.material.transparent = true;
      subGrid.material.opacity = 0.35;
      subGrid.material.depthWrite = false;
    }

    ctx.scene.add(subGrid);

    // Invisible Floor Plane for Raycasting (Teleportation)
    const planeGeo = new THREE.PlaneGeometry(2000, 2000);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const floorPlane = new THREE.Mesh(planeGeo, planeMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.name = 'GroundPlane';
    ctx.scene.add(floorPlane);




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

        if (showRoof) {
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
        }

        // Render Suites (Caged Areas)
        // Render Suites (Caged Areas)
        if (showSuites) {
          (b.suites || []).forEach(suite => {
            const sGroup = new THREE.Group();
            sGroup.position.set(suite.x, 0, suite.y);
            sGroup.rotation.y = suite.rotation || 0;
            group.add(sGroup);

            // 1. Floor Outline (Plane)
            const floorGeo = new THREE.PlaneGeometry(suite.width, suite.depth);
            const floorMat = new THREE.MeshBasicMaterial({
              color: suite.color || 0xffaa00,
              transparent: true,
              opacity: 0.35,
              side: THREE.DoubleSide
            });
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.y = 0.05;
            sGroup.add(floorMesh);

            // 2. Fence (EdgesGeometry) to look like cage
            const wallH = 2.4; // 8ft
            const wallGeo = new THREE.BoxGeometry(suite.width, wallH, suite.depth);
            const edges = new THREE.EdgesGeometry(wallGeo);
            const lineMat = new THREE.LineBasicMaterial({
              color: suite.color || 0xffaa00,
              transparent: true,
              opacity: 0.85
            });
            const cage = new THREE.LineSegments(edges, lineMat);
            cage.position.y = wallH / 2;
            sGroup.add(cage);

            // 3. Label
            const labelDiv = document.createElement('div');
            labelDiv.style.color = suite.color || '#f59e0b';
            labelDiv.style.borderColor = (suite.color || '#f59e0b') + '80';
            labelDiv.className = 'text-xs font-black uppercase tracking-widest border px-2 py-1 rounded bg-black/50';
            labelDiv.textContent = 'Suite ' + suite.name;
            const labelObj = new CSS2DObject(labelDiv);
            labelObj.position.set(0, wallH + 0.5, 0); // Above cage
            sGroup.add(labelObj);
          });
        }

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
            // Store lineup in userData for isolation view
            rackGroup.userData = {
              rackId: rack.id,
              lineUp: rack.lineUp,
              type: 'RACK_GROUP'
            };
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
              post.userData = { rackId: rack.id };
              post.position.set(sx * (rWidth / 2 - frameThickness / 2), rHeight / 2, sz * (rDepth / 2 - frameThickness / 2));
              rackGroup.add(post);
            });

            // --- Directional Arrow (Just Above Floor, Forward of Front Face) ---
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
            // Position just above floor, forward of the front face
            arrowMesh.position.set(0, 0.3, (rDepth / 2) + 0.3);
            arrowMesh.userData = { rackId: rack.id };
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
            if (showRMULabels) {
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
            }

            if (showRackLabels) {
              const labelDiv = document.createElement('div');
              labelDiv.className = 'building-label-3d';
              labelDiv.style.pointerEvents = 'auto';
              labelDiv.onclick = (e) => {
                if (e.ctrlKey) {
                  e.stopPropagation();
                  isUserInteractionRef.current = true;
                  if (onSelectRackRef.current) onSelectRackRef.current(rack.id);
                  if (onSelectEquipmentRef.current) onSelectEquipmentRef.current(null);
                }
              };
              labelDiv.textContent = rack.label;
              if (isSelected) {
                labelDiv.style.borderColor = '#3b82f6';
                labelDiv.style.color = '#3b82f6';
                labelDiv.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
              }
              const labelObj = new CSS2DObject(labelDiv);
              labelObj.position.set(0, rHeight + 0.5, 0);
              rackGroup.add(labelObj);
            }
          });
      } catch (err) {
        console.error("Failed to render BIM Scene:", err);
      }
    });
  }, [buildings, buildingDefs, activeBuildingId, viewLevel, selectedRackId, selectedEquipmentId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled, rackDefs, equipmentDefs, showRackLabels, showRMULabels, visibleStatuses, showRoof, showSuites]);

  return <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden" />;
});

export default Viewer3D;
