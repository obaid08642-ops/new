import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';
import { Circle, Ellipse, G, Line, Svg } from 'react-native-svg';

/**
 * Local interactive 3D body-region selector.
 *
 * The model is procedural: its geometry is truly rotated in 3D, projected with
 * perspective, depth sorted, then drawn locally with SVG. It has no external
 * model dependency and does not transmit touch data off-device.
 */
type V3 = [number, number, number];
type RegionId = 'head' | 'throat' | 'chest' | 'abdomen' | 'pelvis' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

type EllipsoidPart = { kind: 'ellipsoid'; id: RegionId; c: V3; rx: number; ry: number; rz: number; detail?: boolean };
type CapsulePart = { kind: 'capsule'; id: RegionId; a: V3; b: V3; r: number };
type Part = EllipsoidPart | CapsulePart;

type ProjectedEllipsoid = { kind: 'ellipsoid'; id: RegionId; cx: number; cy: number; rx: number; ry: number; z: number; detail?: boolean };
type ProjectedCapsule = { kind: 'capsule'; id: RegionId; x1: number; y1: number; x2: number; y2: number; w: number; z: number };
type Projected = ProjectedEllipsoid | ProjectedCapsule;

const FOCAL = 440;
const WIDTH = 286;

// Each limb is composed from upper/lower segments and a hand/foot.  All segments
// share the same region id so a person sees one clinically meaningful selection.
const MODEL: Part[] = [
  { kind: 'ellipsoid', id: 'head', c: [0, -166, 0], rx: 22, ry: 27, rz: 20, detail: true },
  { kind: 'ellipsoid', id: 'head', c: [0, -148, 10], rx: 11, ry: 9, rz: 5, detail: true },
  { kind: 'capsule', id: 'throat', a: [0, -141, 0], b: [0, -129, 0], r: 8 },
  { kind: 'ellipsoid', id: 'chest', c: [0, -106, 0], rx: 31, ry: 30, rz: 19 },
  { kind: 'ellipsoid', id: 'abdomen', c: [0, -70, 0], rx: 25, ry: 23, rz: 17 },
  { kind: 'ellipsoid', id: 'pelvis', c: [0, -42, 0], rx: 28, ry: 15, rz: 18 },

  { kind: 'capsule', id: 'leftArm', a: [-30, -123, 0], b: [-43, -91, 2], r: 8 },
  { kind: 'capsule', id: 'leftArm', a: [-43, -91, 2], b: [-48, -58, 7], r: 6.8 },
  { kind: 'ellipsoid', id: 'leftArm', c: [-49, -51, 7], rx: 7, ry: 10, rz: 5 },
  { kind: 'capsule', id: 'rightArm', a: [30, -123, 0], b: [43, -91, -2], r: 8 },
  { kind: 'capsule', id: 'rightArm', a: [43, -91, -2], b: [48, -58, -7], r: 6.8 },
  { kind: 'ellipsoid', id: 'rightArm', c: [49, -51, -7], rx: 7, ry: 10, rz: 5 },

  { kind: 'capsule', id: 'leftLeg', a: [-12, -33, 0], b: [-18, 16, 3], r: 11 },
  { kind: 'capsule', id: 'leftLeg', a: [-18, 16, 3], b: [-20, 61, 5], r: 8.7 },
  { kind: 'ellipsoid', id: 'leftLeg', c: [-20, 71, 10], rx: 10, ry: 7, rz: 15 },
  { kind: 'capsule', id: 'rightLeg', a: [12, -33, 0], b: [18, 16, -3], r: 11 },
  { kind: 'capsule', id: 'rightLeg', a: [18, 16, -3], b: [20, 61, -5], r: 8.7 },
  { kind: 'ellipsoid', id: 'rightLeg', c: [20, 71, -10], rx: 10, ry: 7, rz: 15 },
];

function rotate(point: V3, yaw: number, pitch: number): V3 {
  const [x, y, z] = point;
  const cy = Math.cos(yaw); const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

function project(point: V3, cx: number, cy: number) {
  const [x, y, z] = point;
  const scale = FOCAL / (FOCAL + z);
  return { x: cx + x * scale, y: cy + y * scale, z, scale };
}

function distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1; const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

export default function BodyMap3D({
  selected,
  onSelect,
  fill,
  fillSelected,
  stroke,
  strokeSelected,
  height = 420,
  view = 'front',
}: {
  selected: string | null;
  onSelect: (regionId: string) => void;
  fill: string;
  fillSelected: string;
  stroke: string;
  strokeSelected: string;
  height?: number;
  view?: 'front' | 'back';
}) {
  const frontYaw = -0.16;
  const [yaw, setYaw] = useState(frontYaw);
  const [pitch, setPitch] = useState(0.05);
  const state = useRef({ yaw: frontYaw, pitch: 0.05, dragging: false, wasTap: false });
  const cx = WIDTH / 2;
  const cy = height / 2 + 25;

  useEffect(() => {
    const nextYaw = view === 'front' ? frontYaw : Math.PI - frontYaw;
    state.current.yaw = nextYaw;
    setYaw(nextYaw);
  }, [view]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => { state.current.dragging = false; },
    onPanResponderMove: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) state.current.dragging = true;
      setYaw(state.current.yaw + gesture.dx * 0.012);
      setPitch(Math.max(-0.46, Math.min(0.48, state.current.pitch + gesture.dy * 0.006)));
    },
    onPanResponderRelease: (_event, gesture) => {
      state.current.yaw += gesture.dx * 0.012;
      state.current.pitch = Math.max(-0.46, Math.min(0.48, state.current.pitch + gesture.dy * 0.006));
      state.current.wasTap = !state.current.dragging || (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8);
      state.current.dragging = false;
    },
  })).current;

  const parts = useMemo<Projected[]>(() => {
    const projected = MODEL.map((part) => {
      if (part.kind === 'ellipsoid') {
        const r = rotate(part.c, yaw, pitch);
        const p = project(r, cx, cy);
        return { kind: 'ellipsoid' as const, id: part.id, cx: p.x, cy: p.y, rx: part.rx * p.scale, ry: part.ry * p.scale, z: p.z, detail: part.detail };
      }
      const a = rotate(part.a, yaw, pitch);
      const b = rotate(part.b, yaw, pitch);
      const pa = project(a, cx, cy);
      const pb = project(b, cx, cy);
      const z = (a[2] + b[2]) / 2;
      return { kind: 'capsule' as const, id: part.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, w: part.r * 2 * (FOCAL / (FOCAL + z)), z };
    });
    return projected.sort((a, b) => b.z - a.z);
  }, [yaw, pitch, height]);

  const hitTest = (x: number, y: number): RegionId | null => {
    const hits: Array<{ id: RegionId; z: number }> = [];
    parts.forEach((part) => {
      if (part.kind === 'ellipsoid') {
        const dx = (x - part.cx) / Math.max(part.rx + 7, 1);
        const dy = (y - part.cy) / Math.max(part.ry + 7, 1);
        if (dx * dx + dy * dy <= 1) hits.push({ id: part.id, z: part.z });
      } else if (distanceToSegment(x, y, part.x1, part.y1, part.x2, part.y2) <= part.w / 2 + 8) {
        hits.push({ id: part.id, z: part.z });
      }
    });
    return hits.sort((a, b) => a.z - b.z)[0]?.id ?? null;
  };

  const onTap = (event: GestureResponderEvent) => {
    if (!state.current.wasTap) return;
    state.current.wasTap = false;
    const hit = hitTest(event.nativeEvent.locationX, event.nativeEvent.locationY);
    if (hit) onSelect(hit);
  };

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }} {...pan.panHandlers} onStartShouldSetResponder={() => true} onResponderRelease={onTap}>
      <Svg width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Ellipse cx={cx} cy={cy + 3} rx={112} ry={height * 0.45} fill={fill} opacity={0.09} />
        <G>
          {parts.map((part, index) => {
            const active = selected === part.id;
            const opacity = Math.max(0.48, Math.min(1, 0.95 - (part.z + 95) / 300));
            const partFill = active ? fillSelected : fill;
            const partStroke = active ? strokeSelected : stroke;
            if (part.kind === 'ellipsoid') {
              return <G key={`${part.id}-${index}`} opacity={opacity}>
                <Ellipse cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} fill={partFill} stroke={partStroke} strokeWidth={active ? 3 : 1.35} />
                {part.detail && part.id === 'head' && <>
                  <Circle cx={part.cx + part.rx * (yaw < 1.4 && yaw > -1.4 ? 0.3 : -0.3)} cy={part.cy - part.ry * 0.14} r={Math.max(1.4, part.rx * 0.07)} fill={partStroke} opacity={0.6} />
                  <Line x1={part.cx - part.rx * 0.13} y1={part.cy + part.ry * 0.3} x2={part.cx + part.rx * 0.2} y2={part.cy + part.ry * 0.3} stroke={partStroke} strokeWidth={1} opacity={0.28} />
                </>}
              </G>;
            }
            return <Line key={`${part.id}-${index}`} x1={part.x1} y1={part.y1} x2={part.x2} y2={part.y2} stroke={partFill} strokeWidth={part.w} strokeLinecap="round" opacity={opacity} />;
          })}
          {parts.filter((p) => p.id === selected).map((part, index) => part.kind === 'ellipsoid'
            ? <Ellipse key={`selected-${index}`} cx={part.cx} cy={part.cy} rx={part.rx + 4} ry={part.ry + 4} fill="none" stroke={strokeSelected} strokeWidth={2.4} strokeDasharray="6 4" />
            : <Line key={`selected-${index}`} x1={part.x1} y1={part.y1} x2={part.x2} y2={part.y2} stroke={strokeSelected} strokeWidth={part.w + 5} strokeLinecap="round" opacity={0.34} />)}
        </G>
      </Svg>
    </View>
  );
}
