/**
 * BodyMap3D — a REAL rotatable 3D human body region selector.
 *
 * Software-rendered 3D: a procedural humanoid model (spheres, ellipsoids and
 * capsules in 3D space) is rotated with yaw/pitch matrices, perspective-
 * projected, depth-sorted (painter's algorithm) and drawn with react-native-svg.
 * Pan = rotate 360°, tap = pick the nearest projected part. No images, no
 * flat 2D map — the geometry is genuinely three-dimensional.
 */
import React, { useMemo, useRef, useState } from "react";
import { View, PanResponder, GestureResponderEvent } from "react-native";
import { Svg, Circle, Ellipse, Line, G } from "react-native-svg";

type V3 = [number, number, number];

interface EllipsoidPart {
  kind: "ellipsoid";
  id: string;
  c: V3;      // center
  rx: number; // horizontal radius
  ry: number; // vertical radius
  rz: number; // depth radius (shading)
}
interface CapsulePart {
  kind: "capsule";
  id: string;
  a: V3;      // start joint
  b: V3;      // end joint
  r: number;  // limb radius
}
type Part = EllipsoidPart | CapsulePart;

/* Procedural body model — ids match the symptom-checker BODY_REGIONS ids */
const MODEL: Part[] = [
  { kind: "ellipsoid", id: "head", c: [0, -162, 0], rx: 17, ry: 20, rz: 16 },
  { kind: "capsule", id: "throat", a: [0, -144, 0], b: [0, -132, 0], r: 7 },
  { kind: "ellipsoid", id: "chest", c: [0, -106, 0], rx: 24, ry: 26, rz: 13 },
  { kind: "ellipsoid", id: "abdomen", c: [0, -70, 0], rx: 19, ry: 16, rz: 11 },
  { kind: "ellipsoid", id: "pelvis", c: [0, -46, 0], rx: 21, ry: 12, rz: 12 },
  // viewer-left = model -x (mirrors correctly as you rotate)
  { kind: "capsule", id: "leftArm", a: [-27, -122, 0], b: [-36, -64, 0], r: 7 },
  { kind: "capsule", id: "rightArm", a: [27, -122, 0], b: [36, -64, 0], r: 7 },
  { kind: "capsule", id: "leftLeg", a: [-11, -38, 0], b: [-14, 16, 0], r: 9 },
  { kind: "capsule", id: "rightLeg", a: [11, -38, 0], b: [14, 16, 0], r: 9 },
];

const FOCAL = 430;

interface ProjectedEllipsoid { kind: "ellipsoid"; id: string; cx: number; cy: number; rx: number; ry: number; z: number; }
interface ProjectedCapsule { kind: "capsule"; id: string; x1: number; y1: number; x2: number; y2: number; w: number; z: number; }
type Projected = ProjectedEllipsoid | ProjectedCapsule;

function rotate(p: V3, yaw: number, pitch: number): V3 {
  const [x, y, z] = p;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  return [x1, y2, z2];
}

function project(p: V3, cx: number, cy: number): { x: number; y: number; s: number; z: number } {
  const [px, py, pz] = p;
  const s = FOCAL / (FOCAL + pz);
  return { x: cx + px * s, y: cy + py * s, s, z: pz };
}

export default function BodyMap3D({
  selected,
  onSelect,
  fill,
  fillSelected,
  stroke,
  strokeSelected,
  height = 420,
}: {
  selected: string | null;
  onSelect: (regionId: string) => void;
  fill: string;
  fillSelected: string;
  stroke: string;
  strokeSelected: string;
  height?: number;
}) {
  const [yaw, setYaw] = useState(-0.22);
  const [pitch, setPitch] = useState(0.06);
  const stateRef = useRef({ yaw: -0.22, pitch: 0.06, dragging: false, wasTap: false });

  const W = 260;
  const CX = W / 2;
  const CY = height / 2 + 12;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { stateRef.current.dragging = false; },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) stateRef.current.dragging = true;
        const nextYaw = stateRef.current.yaw + g.dx * 0.012;
        const nextPitch = Math.max(-0.5, Math.min(0.55, stateRef.current.pitch + g.dy * 0.006));
        setYaw(nextYaw);
        setPitch(nextPitch);
      },
      onPanResponderRelease: (_e, g) => {
        stateRef.current.yaw += g.dx * 0.012;
        stateRef.current.pitch = Math.max(-0.5, Math.min(0.55, stateRef.current.pitch + g.dy * 0.006));
        // short movement = tap, not drag
        if (!stateRef.current.dragging || (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8)) {
          stateRef.current.wasTap = true;
        }
        stateRef.current.dragging = false;
      },
    }),
  ).current;

  const parts: Projected[] = useMemo(() => {
    const out: Projected[] = MODEL.map((p) => {
      if (p.kind === "ellipsoid") {
        const rc = rotate(p.c, yaw, pitch);
        const pr = project(rc, CX, CY);
        return { kind: "ellipsoid", id: p.id, cx: pr.x, cy: pr.y, rx: p.rx * pr.s, ry: p.ry * pr.s, z: pr.z };
      }
      const ra = rotate(p.a, yaw, pitch);
      const rb = rotate(p.b, yaw, pitch);
      const pa = project(ra, CX, CY);
      const pb = project(rb, CX, CY);
      const zMid = (ra[2] + rb[2]) / 2;
      const sMid = FOCAL / (FOCAL + zMid);
      return { kind: "capsule", id: p.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, w: p.r * 2 * sMid, z: zMid };
    });
    // painter's algorithm — far parts first
    out.sort((a, b) => b.z - a.z);
    return out;
  }, [yaw, pitch]);

  const shade = (z: number) => Math.max(0.52, Math.min(1, 0.98 - (z + 70) / 260));

  const hitTest = (x: number, y: number): string | null => {
    // nearest-facing part wins among hits
    const hits: { id: string; z: number }[] = [];
    for (const p of parts) {
      if (p.kind === "ellipsoid") {
        const nx = (x - p.cx) / (p.rx + 6);
        const ny = (y - p.cy) / (p.ry + 6);
        if (nx * nx + ny * ny <= 1) hits.push({ id: p.id, z: p.z });
      } else {
        const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((x - p.x1) * dx + (y - p.y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = p.x1 + t * dx, py = p.y1 + t * dy;
        const dist = Math.hypot(x - px, y - py);
        if (dist <= p.w / 2 + 8) hits.push({ id: p.id, z: p.z });
      }
    }
    if (!hits.length) return null;
    hits.sort((a, b) => a.z - b.z); // smallest z = closest to viewer
    return hits[0].id;
  };

  const onTap = (e: GestureResponderEvent) => {
    if (!stateRef.current.wasTap) return;
    stateRef.current.wasTap = false;
    const { locationX, locationY } = e.nativeEvent;
    const id = hitTest(locationX, locationY);
    if (id) onSelect(id);
  };

  return (
    <View
      style={{ height, alignItems: "center", justifyContent: "center" }}
      {...pan.panHandlers}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onTap}
    >
      <Svg width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
        <G>
          {parts.map((p) => {
            const isSel = selected === p.id;
            const s = shade(p.z);
            const baseFill = isSel ? fillSelected : fill;
            const baseStroke = isSel ? strokeSelected : stroke;
            if (p.kind === "ellipsoid") {
              return (
                <G key={p.id} opacity={s}>
                  <Ellipse
                    cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                    fill={baseFill} stroke={baseStroke} strokeWidth={isSel ? 3 : 1.5}
                  />
                  {p.id === "head" && (
                    // simple face hint on the front-facing side
                    <Circle cx={p.cx} cy={p.cy - p.ry * 0.15} r={Math.max(1.6, p.rx * 0.08)} fill={baseStroke} opacity={yaw > -1.4 && yaw < 1.4 ? 0.9 : 0} />
                  )}
                </G>
              );
            }
            return (
              <Line
                key={p.id}
                x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                stroke={baseFill} strokeWidth={p.w} strokeLinecap="round"
                opacity={s}
              />
            );
          })}
          {/* selection ring drawn last so it stays visible */}
          {parts.filter((p) => p.id === selected).map((p) => (
            p.kind === "ellipsoid" ? (
              <Ellipse
                key={`sel-${p.id}`}
                cx={p.cx} cy={p.cy} rx={p.rx + 4} ry={p.ry + 4}
                fill="none" stroke={strokeSelected} strokeWidth={2.5} strokeDasharray="6 4"
              />
            ) : (
              <Line
                key={`sel-${p.id}`}
                x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                stroke={strokeSelected} strokeWidth={p.w + 5} strokeLinecap="round"
                opacity={0.35}
              />
            )
          ))}
        </G>
      </Svg>
    </View>
  );
}
