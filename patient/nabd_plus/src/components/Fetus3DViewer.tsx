import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { useApp } from '../context/AppContext';

/**
 * Local, procedural fetal-development viewer.
 *
 * It deliberately avoids an external WebView/model provider. Geometry is rotated
 * in 3D space, projected with perspective, and changes its proportions by week.
 * The model is an educational representation only—not a scan or patient-specific
 * measurement.
 */
type Point3 = [number, number, number];
type LabelKey = 'head' | 'arm' | 'leg' | 'body';

type Ellipsoid = { id: LabelKey; center: Point3; rx: number; ry: number; rz: number };
type Limb = { id: LabelKey; start: Point3; end: Point3; radius: number };

type ProjectedEllipsoid = Ellipsoid & { x: number; y: number; z: number; sx: number; sy: number };
type ProjectedLimb = Limb & { x1: number; y1: number; x2: number; y2: number; z: number; width: number };

const FOCAL = 430;
const VIEW_WIDTH = 300;

const LABELS: Record<LabelKey, string> = {
  head: 'الرأس',
  arm: 'الذراع',
  leg: 'الساق',
  body: 'الجذع',
};

const VIEWER_COPY: Record<string, { parts: Record<LabelKey, string>; stages: Record<string, string> }> = {
  ar: { parts: LABELS, stages: { 'مرحلة مبكرة': 'مرحلة مبكرة', 'جنين مبكر': 'جنين مبكر', 'بداية التمايز': 'بداية التمايز', 'جنين صغير': 'جنين صغير', 'بداية الثلث الثاني': 'بداية الثلث الثاني', 'الثلث الثاني': 'الثلث الثاني', 'بداية الثلث الثالث': 'بداية الثلث الثالث', 'الثلث الثالث': 'الثلث الثالث' } },
  en: { parts: { head: 'Head', arm: 'Arm', leg: 'Leg', body: 'Torso' }, stages: { 'مرحلة مبكرة': 'Early stage', 'جنين مبكر': 'Early embryo', 'بداية التمايز': 'Early development', 'جنين صغير': 'Small fetus', 'بداية الثلث الثاني': 'Early second trimester', 'الثلث الثاني': 'Second trimester', 'بداية الثلث الثالث': 'Early third trimester', 'الثلث الثالث': 'Third trimester' } },
  ur: { parts: { head: 'سر', arm: 'بازو', leg: 'ٹانگ', body: 'دھڑ' }, stages: { 'مرحلة مبكرة': 'ابتدائی مرحلہ', 'جنين مبكر': 'ابتدائی جنین', 'بداية التمايز': 'ابتدائی نشوونما', 'جنين صغير': 'چھوٹا جنین', 'بداية الثلث الثاني': 'دوسری سہ ماہی کا آغاز', 'الثلث الثاني': 'دوسری سہ ماہی', 'بداية الثلث الثالث': 'تیسری سہ ماہی کا آغاز', 'الثلث الثالث': 'تیسری سہ ماہی' } },
  hi: { parts: { head: 'सिर', arm: 'बांह', leg: 'पैर', body: 'धड़' }, stages: { 'مرحلة مبكرة': 'प्रारंभिक चरण', 'جنين مبكر': 'प्रारंभिक भ्रूण', 'بداية التمايز': 'प्रारंभिक विकास', 'جنين صغير': 'छोटा भ्रूण', 'بداية الثلث الثاني': 'दूसरी तिमाही की शुरुआत', 'الثلث الثاني': 'दूसरी तिमाही', 'بداية الثلث الثالث': 'तीसरी तिमाही की शुरुआत', 'الثلث الثالث': 'तीसरी तिमाही' } },
  bn: { parts: { head: 'মাথা', arm: 'হাত', leg: 'পা', body: 'ধড়' }, stages: { 'مرحلة مبكرة': 'প্রাথমিক ধাপ', 'جنين مبكر': 'প্রারম্ভিক ভ্রূণ', 'بداية التمايز': 'প্রাথমিক বিকাশ', 'جنين صغير': 'ছোট ভ্রূণ', 'بداية الثلث الثاني': 'দ্বিতীয় ত্রৈমাসিকের শুরু', 'الثلث الثاني': 'দ্বিতীয় ত্রৈমাসিক', 'بداية الثلث الثالث': 'তৃতীয় ত্রৈমাসিকের শুরু', 'الثلث الثالث': 'তৃতীয় ত্রৈমাসিক' } },
  fil: { parts: { head: 'Ulo', arm: 'Braso', leg: 'Binti', body: 'Katawan' }, stages: { 'مرحلة مبكرة': 'Maagang yugto', 'جنين مبكر': 'Maagang embryo', 'بداية التمايز': 'Maagang pag-unlad', 'جنين صغير': 'Maliit na fetus', 'بداية الثلث الثاني': 'Simula ng ikalawang trimester', 'الثلث الثاني': 'Ikalawang trimester', 'بداية الثلث الثالث': 'Simula ng ikatlong trimester', 'الثلث الثالث': 'Ikatlong trimester' } },
};

function rotate(point: Point3, yaw: number, pitch: number): Point3 {
  const [x, y, z] = point;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

function project(point: Point3, centerX: number, centerY: number) {
  const [x, y, z] = point;
  const scale = FOCAL / (FOCAL + z);
  return { x: centerX + x * scale, y: centerY + y * scale, z, scale };
}

function stageForWeek(week: number) {
  if (week <= 2) return { title: 'مرحلة مبكرة', caption: 'تمثيل تعليمي لبداية التطور', scale: 0.25 };
  if (week <= 4) return { title: 'جنين مبكر', caption: 'ملامح أولية في طور التكوين', scale: 0.38 };
  if (week <= 8) return { title: 'بداية التمايز', caption: 'الرأس وبراعم الأطراف تتضح تدريجياً', scale: 0.54 };
  if (week <= 12) return { title: 'جنين صغير', caption: 'الأطراف الصغيرة تزداد تمايزاً', scale: 0.68 };
  if (week <= 16) return { title: 'بداية الثلث الثاني', caption: 'الجسم يزداد طولاً وتناسقاً', scale: 0.8 };
  if (week <= 24) return { title: 'الثلث الثاني', caption: 'تمثيل تعليمي لنمو متدرج ومتوازن', scale: 0.96 };
  if (week <= 32) return { title: 'بداية الثلث الثالث', caption: 'تزداد الاستدارة مع استمرار النمو', scale: 1.08 };
  return { title: 'الثلث الثالث', caption: 'هيئة تعليمية لجنين متطور', scale: 1.18 };
}

function buildBody(week: number) {
  const { scale } = stageForWeek(week);
  const headDominance = Math.max(0.86, 1.46 - week * 0.018);
  const bodyLength = 84 * scale;
  const headRadius = 25 * scale * headDominance;
  const bodyCenterY = -8 * scale;
  const headY = bodyCenterY - bodyLength * 0.58;
  const armLength = Math.max(12, 41 * scale);
  const legLength = Math.max(10, 47 * scale);

  const ellipsoids: Ellipsoid[] = [
    { id: 'head', center: [0, headY, 4], rx: headRadius * 0.82, ry: headRadius, rz: headRadius * 0.86 },
    { id: 'body', center: [0, bodyCenterY, 0], rx: 19 * scale, ry: bodyLength * 0.48, rz: 15 * scale },
  ];

  const limbs: Limb[] = week < 5 ? [] : [
    { id: 'arm', start: [-15 * scale, bodyCenterY - bodyLength * 0.22, 1], end: [-29 * scale, bodyCenterY + armLength * 0.18, 6], radius: Math.max(3, 6 * scale) },
    { id: 'arm', start: [15 * scale, bodyCenterY - bodyLength * 0.22, -1], end: [29 * scale, bodyCenterY + armLength * 0.18, -6], radius: Math.max(3, 6 * scale) },
    { id: 'leg', start: [-9 * scale, bodyCenterY + bodyLength * 0.36, 2], end: [-21 * scale, bodyCenterY + bodyLength * 0.36 + legLength, 4], radius: Math.max(3.5, 7 * scale) },
    { id: 'leg', start: [9 * scale, bodyCenterY + bodyLength * 0.36, -2], end: [21 * scale, bodyCenterY + bodyLength * 0.36 + legLength, -4], radius: Math.max(3.5, 7 * scale) },
  ];

  return { ellipsoids, limbs };
}

function hitCircle(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const nx = (x - cx) / Math.max(rx, 1);
  const ny = (y - cy) / Math.max(ry, 1);
  return nx * nx + ny * ny <= 1;
}

export default function Fetus3DViewer({
  week,
  height = 280,
  accent = '#EC4899',
  background = '#FCE7F3',
  labels = LABELS,
}: {
  week: number;
  height?: number;
  accent?: string;
  background?: string;
  labels?: Record<LabelKey, string>;
}) {
  const { lang } = useApp();
  const copy = VIEWER_COPY[lang] || VIEWER_COPY.ar;
  const visibleLabels = labels === LABELS ? copy.parts : labels;
  const [yaw, setYaw] = useState(-0.48);
  const [pitch, setPitch] = useState(0.12);
  const [selected, setSelected] = useState<LabelKey | null>(null);
  const state = useRef({ yaw: -0.48, pitch: 0.12, dragging: false, tap: false });
  const stage = stageForWeek(week);
  const centerX = VIEW_WIDTH / 2;
  const centerY = height / 2 + 12;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => { state.current.dragging = false; },
    onPanResponderMove: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) state.current.dragging = true;
      setYaw(state.current.yaw + gesture.dx * 0.012);
      setPitch(Math.max(-0.44, Math.min(0.48, state.current.pitch + gesture.dy * 0.006)));
    },
    onPanResponderRelease: (_event, gesture) => {
      state.current.yaw += gesture.dx * 0.012;
      state.current.pitch = Math.max(-0.44, Math.min(0.48, state.current.pitch + gesture.dy * 0.006));
      state.current.tap = !state.current.dragging || (Math.abs(gesture.dx) < 7 && Math.abs(gesture.dy) < 7);
      state.current.dragging = false;
    },
  })).current;

  const scene = useMemo(() => {
    const { ellipsoids, limbs } = buildBody(week);
    const shapes: Array<ProjectedEllipsoid | ProjectedLimb> = [];

    ellipsoids.forEach((part) => {
      const rotated = rotate(part.center, yaw, pitch);
      const projected = project(rotated, centerX, centerY);
      shapes.push({ ...part, x: projected.x, y: projected.y, z: projected.z, sx: part.rx * projected.scale, sy: part.ry * projected.scale });
    });

    limbs.forEach((part) => {
      const start = rotate(part.start, yaw, pitch);
      const end = rotate(part.end, yaw, pitch);
      const p1 = project(start, centerX, centerY);
      const p2 = project(end, centerX, centerY);
      const z = (start[2] + end[2]) / 2;
      const scale = FOCAL / (FOCAL + z);
      shapes.push({ ...part, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, z, width: part.radius * 2 * scale });
    });

    return shapes.sort((a, b) => b.z - a.z);
  }, [week, yaw, pitch, height]);

  const onRelease = (event: any) => {
    if (!state.current.tap || week <= 4) return;
    state.current.tap = false;
    const { locationX, locationY } = event.nativeEvent;
    const visible = [...scene].sort((a, b) => a.z - b.z);
    for (const item of visible) {
      if ('x' in item && hitCircle(locationX, locationY, item.x, item.y, item.sx + 8, item.sy + 8)) {
        setSelected(item.id);
        return;
      }
      if ('x1' in item) {
        const dx = item.x2 - item.x1;
        const dy = item.y2 - item.y1;
        const len = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((locationX - item.x1) * dx + (locationY - item.y1) * dy) / len));
        const px = item.x1 + t * dx;
        const py = item.y1 + t * dy;
        if (Math.hypot(locationX - px, locationY - py) <= item.width / 2 + 9) {
          setSelected(item.id);
          return;
        }
      }
    }
    setSelected(null);
  };

  if (week <= 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }} {...pan.panHandlers} onResponderRelease={onRelease}>
        <Svg width={VIEW_WIDTH} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`}>
          <Defs>
            <RadialGradient id="cell" cx="36%" cy="28%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor="#FFF9F5" />
              <Stop offset="45%" stopColor="#FBB6CE" />
              <Stop offset="100%" stopColor="#C24178" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={centerX} cy={centerY} rx={104} ry={104} fill={background} opacity={0.48} />
          <Circle cx={centerX} cy={centerY} r={week === 1 ? 25 : 39} fill="url(#cell)" stroke={accent} strokeOpacity={0.42} strokeWidth={2} />
          {week === 2 && [0, 1, 2, 3, 4, 5].map((n) => <Circle key={n} cx={centerX + Math.cos(n * Math.PI / 3) * 21} cy={centerY + Math.sin(n * Math.PI / 3) * 21} r={11} fill="#FCD5E5" opacity={0.76} />)}
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }} {...pan.panHandlers} onResponderRelease={onRelease}>
      <Svg width={VIEW_WIDTH} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`}>
        <Defs>
          <RadialGradient id="fetalGlow" cx="36%" cy="26%" rx="74%" ry="74%">
            <Stop offset="0%" stopColor="#FFF8F2" />
            <Stop offset="46%" stopColor="#F9A8C2" />
            <Stop offset="100%" stopColor="#C24178" />
          </RadialGradient>
          <RadialGradient id="fetalGlowSelected" cx="32%" cy="20%" rx="78%" ry="78%">
            <Stop offset="0%" stopColor="#FFFDF8" />
            <Stop offset="42%" stopColor="#FDE68A" />
            <Stop offset="100%" stopColor={accent} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={centerX} cy={centerY + 4} rx={126} ry={Math.min(height * 0.42, 118)} fill={background} opacity={0.52} />
        <Path d={`M ${centerX - 92} ${centerY + 82} Q ${centerX} ${centerY + 132} ${centerX + 100} ${centerY + 72}`} stroke="#FFFFFF" strokeOpacity={0.34} strokeWidth={1.5} fill="none" />
        <G>
          {scene.map((item, index) => {
            const active = selected === item.id;
            const opacity = Math.max(0.5, Math.min(1, 0.9 - item.z / 320));
            if ('x' in item) {
              return <Ellipse key={`${item.id}-${index}`} cx={item.x} cy={item.y} rx={item.sx} ry={item.sy} fill={active ? 'url(#fetalGlowSelected)' : 'url(#fetalGlow)'} stroke={active ? accent : '#FAD1DF'} strokeWidth={active ? 2.6 : 1.1} opacity={opacity} />;
            }
            return <Line key={`${item.id}-${index}`} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke={active ? accent : '#F6A9C1'} strokeWidth={item.width} strokeLinecap="round" opacity={opacity} />;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', bottom: 4, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }} pointerEvents="none">
        <Text style={{ color: '#9D174D', fontSize: 11, fontWeight: '700' }}>{copy.stages[stage.title] || stage.title}</Text>
      </View>
      {selected && <View pointerEvents="none" style={{ position: 'absolute', top: 10, backgroundColor: accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{visibleLabels[selected]}</Text></View>}
    </View>
  );
}

export { LABELS, stageForWeek };
