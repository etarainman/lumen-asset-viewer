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
  showGrid?: boolean;
  showSuites?: boolean;
  showEqLabels?: boolean;
  visibleStatuses?: Status4D[];
  onSelectRack?: (id: string | null) => void;
  onSelectEquipment?: (id: string | null) => void;
  focusTrigger?: number;
  clashingIds?: Set<string>;
  hiddenLineUps?: Set<string>;
  showVirtualTours?: boolean;
}

const Viewer3D = forwardRef<Viewer3DHandle, Viewer3DProps>(({
  viewLevel, buildings, buildingDefs, activeBuildingId,
  selectedRackId, selectedEquipmentId, shellOpacity, statuses, owners, colorMode, colorCodingEnabled,
  rackDefs, equipmentDefs = [], showRackLabels = true, showRMULabels = false, showEqLabels = true, showRoof = false, showGrid = false, showSuites = true, showVirtualTours = true, visibleStatuses = Object.values(Status4D), onSelectRack, onSelectEquipment, focusTrigger = 0, clashingIds, hiddenLineUps
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

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.scene.traverse(obj => {
        if (obj.userData?.type === 'GRID') obj.visible = showGrid;
      });
    }
  }, [showGrid]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isUserInteractionRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    const handleResize = () => {
      if (containerRef.current && contextRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        contextRef.current.renderer.setSize(w, h);
        contextRef.current.labelRenderer.setSize(w, h);
        contextRef.current.perspectiveCamera.aspect = w / h;
        contextRef.current.perspectiveCamera.updateProjectionMatrix();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
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

  useImperativeHandle(ref, () => ({
    setCameraPreset: (preset, explicitLineup) => {
      const ctx = contextRef.current;
      if (!ctx || !ctx.activeCamera) return;

      const { perspectiveCamera, orthoCamera, controls } = ctx;
      const isOrtho = preset === 'PLAN' || preset === 'ELEVATION';

      let targetLineup = explicitLineup || '001';

      ctx.activeCamera = isOrtho ? orthoCamera : perspectiveCamera;
      controls.object = ctx.activeCamera;
      ctx.renderer.clippingPlanes = [];

      if (preset === 'PLAN') {
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
        controls.minPolarAngle = Math.PI / 2;
        controls.maxPolarAngle = Math.PI / 2;

        let targetRacks = [];
        const activeB = buildings.find(b => b.id === activeBuildingId);
        if (activeB) {
          if (!explicitLineup) {
            const selectedRack = activeB.racks.find(r => r.id === selectedRackId);
            targetLineup = selectedRack?.lineUp || activeB.racks[0]?.lineUp || '001';
          }
          if (targetLineup) {
            targetRacks = activeB.racks.filter(r => r.lineUp === targetLineup);
          }
        }

        if (targetRacks.length > 0) {
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

          let avgRot = 0;
          targetRacks.forEach(r => avgRot += (r.rotation || 0));
          avgRot /= targetRacks.length;
          avgRot = (avgRot % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          const step = Math.PI / 2;
          const snapRot = Math.round(avgRot / step) * step;

          let camX = cenX;
          let camZ = cenZ;
          let azimuth = 0;

          if (Math.abs(snapRot - 0) < 0.1 || Math.abs(snapRot - Math.PI * 2) < 0.1) {
            camZ = cenZ + 50; azimuth = 0;
          } else if (Math.abs(snapRot - Math.PI / 2) < 0.1) {
            camX = cenX + 50; azimuth = Math.PI / 2;
          } else if (Math.abs(snapRot - Math.PI) < 0.1) {
            camZ = cenZ - 50; azimuth = Math.PI;
          } else {
            camX = cenX - 50; azimuth = -Math.PI / 2;
          }

          controls.minAzimuthAngle = azimuth;
          controls.maxAzimuthAngle = azimuth;
          orthoCamera.position.set(camX, 5, camZ);
          orthoCamera.lookAt(cenX, 5, cenZ);
          const maxDim = Math.max(spanX, spanZ, 8);
          const fitZoom = 40 / (maxDim * 1.1);
          orthoCamera.zoom = Math.max(fitZoom, 0.5);
          orthoCamera.updateProjectionMatrix();
          controls.target.set(cenX, 5, cenZ);
          controls.enableRotate = false;
        } else {
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
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.enableRotate = true;
        perspectiveCamera.position.set(25, 20, 25);
        controls.target.set(0, 0, 0);
      }

      ctx.scene.traverse((obj) => {
        if (obj.userData && obj.userData.type === 'RACK_GROUP') {
          if (preset === 'ELEVATION') {
            obj.visible = (obj.userData.lineUp === targetLineup);
          } else {
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
      const match = owners.find(o => 
        o.id === item.ownerId || 
        o.id.toLowerCase() === item.ownerId?.toLowerCase() ||
        o.name.toLowerCase() === item.ownerId?.toLowerCase()
      );
      if (match) return match.color;
      
      if (item.ownerId?.toUpperCase().includes('LUMEN')) return owners.find(o => o.id.includes('LUMEN') || o.name.includes('Lumen'))?.color || fallback;
      if (item.ownerId?.toUpperCase().includes('CUSTOMER')) return owners.find(o => o.id.includes('CUSTOMER') || o.name.includes('Customer'))?.color || fallback;
      
      return fallback;
    }
    const sMatch = statuses.find(s => 
      s.id === item.status || 
      s.id.toLowerCase() === item.status?.toLowerCase() ||
      s.label.toLowerCase() === item.status?.toLowerCase()
    );
    return sMatch?.color || fallback;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const perspectiveCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 10000);
    perspectiveCamera.position.set(25, 20, 25);

    const aspect = w / h;
    const orthoCamera = new THREE.OrthographicCamera(40 * aspect / -2, 40 * aspect / 2, 40 / 2, 40 / -2, 0.1, 1000);
    orthoCamera.position.set(0, 50, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.className = 'css2d-renderer-root';
    containerRef.current.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    contextRef.current = { renderer, labelRenderer, scene, perspectiveCamera, orthoCamera, activeCamera: perspectiveCamera, controls, frameId: 0, active: true, raycaster, mouse };

    const animate = () => {
      if (!contextRef.current?.active) return;
      const ctx = contextRef.current;
      ctx.frameId = requestAnimationFrame(animate);

      const activeCam = ctx.activeCamera;
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
      if (!contextRef.current) return;
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      ctx.raycaster.setFromCamera(ctx.mouse, ctx.activeCamera);
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);

      let bestTour = null;
      for (const intersect of intersects) {
        const ud = intersect.object.userData;
        if (ud?.tourUrl) { bestTour = ud.tourUrl; break; }
      }

      if (bestTour) {
        window.open(bestTour, '_blank', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
        return;
      }

      if (!event.ctrlKey || !onSelectRackRef.current) return;
      isUserInteractionRef.current = true;

      let bestEq = null; let bestRack = null;
      for (const intersect of intersects) {
        const ud = intersect.object.userData;
        if (!bestEq && ud?.eqId) { bestEq = ud.eqId; break; }
        if (!bestRack && ud?.rackId) { bestRack = ud.rackId; }
      }
      if (bestEq) {
        if (onSelectEquipmentRef.current) onSelectEquipmentRef.current(bestEq);
        if (onSelectRackRef.current) onSelectRackRef.current(null);
      } else if (bestRack) {
        if (onSelectRackRef.current) onSelectRackRef.current(bestRack);
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
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);
      if (intersects.length > 0) {
        const hit = intersects.find(i => (i.object instanceof THREE.Mesh) || (i.object instanceof THREE.Line));
        if (hit) {
          ctx.controls.target.copy(hit.point);
          if ((ctx.activeCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            const cam = ctx.activeCamera;
            const direction = new THREE.Vector3().subVectors(cam.position, hit.point).normalize();
            cam.position.copy(hit.point).add(direction.multiplyScalar(0.625));
          } else {
            const cam = ctx.activeCamera as THREE.OrthographicCamera;
            cam.zoom = 240;
            cam.updateProjectionMatrix();
          }
          ctx.controls.update();
        }
      }
    };
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    const handleMouseMove = (event: MouseEvent) => {
      if (!contextRef.current) return;
      const ctx = contextRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      ctx.raycaster.setFromCamera(ctx.mouse, ctx.activeCamera);
      const intersects = ctx.raycaster.intersectObjects(ctx.scene.children, true);
      
      let isOverTour = false;
      for (const intersect of intersects) {
        if (intersect.object.userData?.tourUrl) {
          isOverTour = true;
          break;
        }
      }
      renderer.domElement.style.cursor = isOverTour ? 'pointer' : 'default';
    };
    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (contextRef.current) {
        contextRef.current.active = false;
        cancelAnimationFrame(contextRef.current.frameId);
        if (labelRenderer.domElement.parentNode) labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        renderer.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    if (viewLevel === 'BUILDING' && activeBuildingId) ctx.controls.target.set(0, 4, 0);
    else ctx.controls.target.set(0, 0, 0);
    ctx.controls.update();
  }, [viewLevel, activeBuildingId]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx || !activeBuildingId || focusTrigger === 0) return;
    const activeB = buildings.find(b => b.id === activeBuildingId);
    if (!activeB) return;

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
      const dist = 5.0;
      const offset = new THREE.Vector3(0, 0, dist);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      const camPos = target.clone().add(offset);
      const activeCam = ctx.activeCamera;
      if ((activeCam as THREE.PerspectiveCamera).isPerspectiveCamera) {
        activeCam.position.copy(camPos);
        activeCam.lookAt(target);
      } else {
        const cam = activeCam as THREE.OrthographicCamera;
        cam.position.set(camPos.x, target.y, camPos.z);
      }
      ctx.controls.update();
    }
  }, [focusTrigger, selectedRackId, selectedEquipmentId, activeBuildingId, buildings, rackDefs, equipmentDefs]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    if (ctx.labelRenderer.domElement) ctx.labelRenderer.domElement.innerHTML = '';
    ctx.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
        else object.material.dispose();
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
    grid.position.y = 0.01;
    grid.userData = { type: 'GRID' };
    grid.visible = showGrid;
    ctx.scene.add(grid);

    const subGrid = new THREE.GridHelper(100, 400, 0x8a5a7a, 0x4a2a3a);
    subGrid.position.y = 0.02;
    if (subGrid.material instanceof THREE.Material) {
      subGrid.material.transparent = true;
      subGrid.material.opacity = 0.35;
      subGrid.material.depthWrite = false;
    }
    subGrid.userData = { type: 'GRID' };
    subGrid.visible = showGrid;
    ctx.scene.add(subGrid);

    const planeGeo = new THREE.PlaneGeometry(2000, 2000);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const floorPlane = new THREE.Mesh(planeGeo, planeMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.name = 'GroundPlane';
    ctx.scene.add(floorPlane);

    const visibleBuildings = (isBuildingView && activeBuildingId) ? buildings.filter(b => b.id === activeBuildingId) : buildings;

    visibleBuildings.forEach(b => {
      const def = buildingDefs.find(d => d.id === b.definitionId) || buildingDefs[0];
      const group = new THREE.Group();
      const activeB = buildings.find(x => x.id === activeBuildingId);
      const relX = isBuildingView ? (b.x - (activeB?.x || 0)) : b.x;
      const relZ = isBuildingView ? (b.z - (activeB?.z || 0)) : b.z;
      group.position.set(relX, 0, relZ);
      group.rotation.y = -(b.rotation || 0);
      ctx.scene.add(group);

      const activePlan = b.floorPlans?.find(p => p.id === b.activeFloorPlanId);
      if (activePlan && activePlan.visible) {
        if (activePlan.url) {
          new THREE.TextureLoader().load(
            activePlan.url,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              const aspect = texture.image.width / texture.image.height;
              // Base size 10 units, scaled by user setting
              const baseSize = 10;
              const width = baseSize * activePlan.scale;
              const height = (baseSize / aspect) * activePlan.scale;

              const geo = new THREE.PlaneGeometry(width, height);
              const mat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: activePlan.opacity,
                side: THREE.DoubleSide,
                depthWrite: false
              });
              const mesh = new THREE.Mesh(geo, mat);
              mesh.rotation.x = -Math.PI / 2;
              mesh.rotation.z = -activePlan.rotation;
              mesh.position.set(activePlan.x, 0.05, activePlan.z);
              group.add(mesh);
            },
            undefined,
            (err) => {
              console.error('Error loading floor plan texture:', err);
              // Red Square: Texture Load Failed
              const geo = new THREE.PlaneGeometry(20, 20);
              const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
              const mesh = new THREE.Mesh(geo, mat);
              mesh.rotation.x = -Math.PI / 2;
              mesh.position.set(activePlan.x, 0.05, activePlan.z);
              group.add(mesh);
            }
          );
        } else {
          // Yellow Square: URL Missing (Session Expired)
          console.warn('Active plan visible but no URL');
          const geo = new THREE.PlaneGeometry(20, 20);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(activePlan.x, 0.05, activePlan.z);
          group.add(mesh);
        }
      }

      const parseSVGPath = (path: string) => {
        const shape = new THREE.Shape();
        const commands = path.split(/(?=[LMCZ])/);
        commands.forEach(cmd => {
          const type = cmd[0];
          const args = cmd.slice(1).trim().split(/[ ,]+/).map(parseFloat);
          if (type === 'M') shape.moveTo(args[0], args[1]); else if (type === 'L') shape.lineTo(args[0], args[1]); else if (type === 'Z') shape.closePath();
        });
        return shape;
      };

      try {
        const shape = parseSVGPath(def.svgPath || 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z');
        const bHeight = def.height || 10;
        const foundationExtrude = { depth: 0.6, bevelEnabled: false };
        const foundationGeo = new THREE.ExtrudeGeometry(shape, foundationExtrude);
        const foundationMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.rotation.x = Math.PI / 2;
        foundation.position.y = 0;
        foundation.raycast = () => { };
        group.add(foundation);

        const extrudeSettings = { depth: bHeight, bevelEnabled: false };
        const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const resolvedBuildingColor = getObjectColor(b, def.color || '#d2c29d');
        const wallMat = new THREE.MeshStandardMaterial({
          color: resolvedBuildingColor, transparent: shellOpacity < 1.0, opacity: shellOpacity, roughness: 0.2, metalness: 0.5, side: THREE.DoubleSide
        });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.rotation.x = Math.PI / 2;
        walls.position.y = bHeight;
        walls.raycast = () => { };
        group.add(walls);

        if (showRoof) {
          const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
          const roofMat = new THREE.MeshStandardMaterial({ color: def.roofColor || '#ffffff', roughness: 0.2, transparent: shellOpacity < 0.2, opacity: Math.max(shellOpacity * 1.5, 0.4) });
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.rotation.x = Math.PI / 2;
          roof.position.y = bHeight + 1.0;
          roof.scale.set(1.05, 1.05, 1);
          roof.raycast = () => { };
          group.add(roof);
        }

        if (showSuites) {
          (b.suites || []).forEach(suite => {
            const sGroup = new THREE.Group();
            sGroup.position.set(suite.x, 0, suite.y);
            sGroup.rotation.y = suite.rotation || 0;
            group.add(sGroup);
            const floorGeo = new THREE.PlaneGeometry(suite.width, suite.depth);
            const floorMat = new THREE.MeshBasicMaterial({ color: suite.color || 0xffaa00, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.y = 0.05;
            sGroup.add(floorMesh);
            const wallH = 2.4;
            const wallGeo = new THREE.BoxGeometry(suite.width, wallH, suite.depth);
            const edges = new THREE.EdgesGeometry(wallGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: suite.color || 0xffaa00, transparent: true, opacity: 0.85 });
            const cage = new THREE.LineSegments(edges, lineMat);
            cage.position.y = wallH / 2;
            sGroup.add(cage);
            const labelDiv = document.createElement('div');
            labelDiv.style.color = suite.color || '#f59e0b';
            labelDiv.style.borderColor = (suite.color || '#f59e0b') + '80';
            labelDiv.className = 'text-xs font-black uppercase tracking-widest border px-2 py-1 rounded bg-black/50';
            labelDiv.textContent = 'Suite ' + suite.name;
            const labelObj = new CSS2DObject(labelDiv);
            labelObj.position.set(0, wallH + 0.5, 0);
            sGroup.add(labelObj);
          });
        }

        b.racks.forEach(rack => {
          if (hiddenLineUps?.has(rack.lineUp || '')) return;
          const isRackVisible = visibleStatuses.includes(rack.status);
          const rDef = rackDefs?.find(rd => rd.id === rack.definitionId) || rackDefs?.[0] || { width: 2.0, height: 6.5, depth: 3.0, totalU: 42 };
          const rWidth = rDef.width || 2.0;
          const rHeight = Math.min(25, rDef.height || 6.5);
          const rDepth = rDef.depth || 3.0;
          const rU = Math.max(1, rDef.totalU || 42);
          const rUStep = rHeight / rU;
          const resolvedRackColorStr = getObjectColor(rack, rDef.color || '#050505');
          const rackColor = parseInt(resolvedRackColorStr.replace('#', '0x'));
          const isSelected = rack.id === selectedRackId;

          const rackGroup = new THREE.Group();
          rackGroup.position.set(rack.x, 0, rack.y);
          rackGroup.rotation.y = rack.rotation || 0;
          rackGroup.userData = { rackId: rack.id, lineUp: rack.lineUp, type: 'RACK_GROUP' };
          group.add(rackGroup);

          if (isRackVisible) {
            const rackShellGeo = new THREE.BoxGeometry(rWidth, rHeight, rDepth);
            const rackShellMat = new THREE.MeshStandardMaterial({
              color: 0x64748b, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.95
            });
            const rackShell = new THREE.Mesh(rackShellGeo, rackShellMat);
            rackShell.position.y = rHeight / 2;
            rackShell.userData = { rackId: rack.id };
            rackGroup.add(rackShell);

            const frameThickness = isSelected ? 0.08 : 0.05;
            const frameMat = new THREE.MeshStandardMaterial({
              color: isSelected ? 0x3b82f6 : rackColor,
              roughness: 0.1,
              metalness: 0.9,
              emissive: isSelected ? 0x3b82f6 : 0x000000,
              emissiveIntensity: isSelected ? 0.5 : 0
            });

            // --- 4 POSTS ---
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
              const post = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, rHeight, frameThickness), frameMat);
              post.userData = { rackId: rack.id };
              post.position.set(sx * (rWidth / 2 - frameThickness / 2), rHeight / 2, sz * (rDepth / 2 - frameThickness / 2));
              rackGroup.add(post);
            });

            // --- Directional Arrow ---
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
            arrowMesh.rotation.x = -Math.PI / 2;
            arrowMesh.position.set(0, 0.3, (rDepth / 2) + 0.3);
            arrowMesh.userData = { rackId: rack.id };
            rackGroup.add(arrowMesh);

            // RMU LABELS
            if (showRMULabels) {
              const labelIncrements = [];
              for (let u = 1; u <= rU; u += 2) labelIncrements.push(u);
              if (!labelIncrements.includes(rU)) labelIncrements.push(rU);
              labelIncrements.forEach(u => {
                [-1, 1].forEach(side => {
                  const labelDiv = document.createElement('div');
                  labelDiv.className = `text-[13px] font-black font-mono transition-all ${isSelected ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-slate-400'}`;
                  labelDiv.textContent = `${u}`;
                  const labelObj = new CSS2DObject(labelDiv);
                  const yPos = ((u - 1) * rUStep);
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
                labelDiv.style.borderColor = '#3b82f6'; labelDiv.style.color = '#3b82f6'; labelDiv.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
              }
              const labelObj = new CSS2DObject(labelDiv);
              labelObj.position.set(0, rHeight + 0.5, 0);
              rackGroup.add(labelObj);
            }

            // --- 360 VIRTUAL TOUR HOTSPOT ---
            if (showVirtualTours && rack.virtualTourUrl) {
              const tourGeo = new THREE.SphereGeometry(0.4, 32, 32);
              const tourMat = new THREE.MeshStandardMaterial({
                color: 0xd92d20, // Red-600
                emissive: 0xd92d20,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.9,
                roughness: 0,
                metalness: 1
              });
              const tourSphere = new THREE.Mesh(tourGeo, tourMat);
              // Position 2.5 units in front and at half-height
              tourSphere.position.set(0, rHeight / 2, (rDepth / 2) + 2.5);
              tourSphere.userData = { tourUrl: rack.virtualTourUrl };
              rackGroup.add(tourSphere);

              // Pulsing Animation Logic (Subtle)
              const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
              tourSphere.scale.set(pulseScale, pulseScale, pulseScale);

              // 360 Label for Hotspot
              const tourLabelDiv = document.createElement('div');
              tourLabelDiv.className = 'px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-400 text-[8px] font-black tracking-widest backdrop-blur-sm pointer-events-none';
              tourLabelDiv.textContent = '360° TOUR';
              const tourLabel = new CSS2DObject(tourLabelDiv);
              tourLabel.position.set(0, 0.6, 0);
              tourSphere.add(tourLabel);
            }
          }

          // EQUIPMENT
          const rackEquipment = b.equipment.filter(e => e.rackId === rack.id && visibleStatuses.includes(e.status));
          rackEquipment.forEach(eq => {
            const eqDef = equipmentDefs.find(d => d.id === eq.definitionId);
            const eqUHeight = eqDef?.heightU || 1;
            const eqHeight = eqUHeight * rUStep;
            const eqDepth = eqDef?.depth || (rDepth - 0.2);
            const eqWidth = rWidth - 0.1;
            const resolvedEqColorStr = getObjectColor(eq, eqDef?.color || '#3b82f6');
            const eqColor = parseInt(resolvedEqColorStr.replace('#', '0x'));
            const isEqSelected = eq.id === selectedEquipmentId;
            const isClashing = clashingIds?.has(eq.id);
            const eqGeo = new THREE.BoxGeometry(eqWidth, eqHeight - 0.02, eqDepth);
            const eqMat = new THREE.MeshStandardMaterial({
              color: isClashing ? 0xff0000 : (isEqSelected ? 0x3b82f6 : eqColor),
              roughness: 0.6,
              metalness: 0.3,
              emissive: isClashing ? 0xff0000 : (isEqSelected ? 0x3b82f6 : 0x000000),
              emissiveIntensity: isClashing ? 0.5 : (isEqSelected ? 0.8 : 0)
            });
            const eqMesh = new THREE.Mesh(eqGeo, eqMat);
            eqMesh.userData = { eqId: eq.id };
            const yPos = ((eq.baseRMU - 1) * rUStep) + (eqHeight / 2);
            eqMesh.position.set(0, yPos, (rDepth - eqDepth) / 2);
            rackGroup.add(eqMesh);

            // EQ FRONT FACE LABEL
            if (showEqLabels) {
              const labelDiv = document.createElement('div');
              const vendor = eqDef?.manufacturer || '';
              const model = eqDef?.name || '';
              labelDiv.className = 'text-[11px] font-black uppercase tracking-tighter text-white/90 bg-black/60 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none whitespace-nowrap text-center flex flex-col items-center justify-center min-w-[50px] shadow-lg';
              labelDiv.innerHTML = `<span class="opacity-60 text-[8px] leading-tight">${vendor}</span><span class="leading-tight">${model}</span>`;
              const labelObj = new CSS2DObject(labelDiv);
              // Position on the front face (z increases towards the front in this setup)
              labelObj.position.set(0, yPos, (rDepth / 2) + 0.01);
              rackGroup.add(labelObj);
            }
          });
        });
      } catch (err) { console.error("Failed to render BIM Scene:", err); }
    });
  }, [buildings, buildingDefs, activeBuildingId, viewLevel, shellOpacity, statuses, owners, colorMode, colorCodingEnabled, rackDefs, equipmentDefs, showRackLabels, showRMULabels, showEqLabels, showRoof, showSuites, showVirtualTours, visibleStatuses, selectedRackId, selectedEquipmentId, clashingIds, hiddenLineUps]);

  return <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden" />;
});
Viewer3D.displayName = 'Viewer3D';
export default Viewer3D;
