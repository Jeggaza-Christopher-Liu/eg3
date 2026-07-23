import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import type { CatmullRomCurve3 } from "three";
import type { HighlightRegion } from "./threeG3dUtil";
import { bpToClosestIndex } from "./threeG3dUtil";
import "./ThreeScene.css";

interface ChromosomeLineProps {
  chrom: string;
  spline: CatmullRomCurve3;
  starts: number[];
  color: string;
  showLabel: boolean;
  highlightColor: string;
  highlights: HighlightRegion[];
}

interface ThreeSceneProps {
  data: Array<{ chrom: string; spline: CatmullRomCurve3; color: string; starts: number[] }>;
  options: {
    backgroundColor: string;
    showChromLabels: boolean;
    highlightColor?: string;
  };
  highlights?: HighlightRegion[];
  width: number;
  height: number;
}

const LINE_SEGMENTS = 200;

const ChromosomeLine = ({
  chrom,
  spline,
  starts,
  color,
  showLabel,
  highlightColor,
  highlights,
}: ChromosomeLineProps) => {
  const points = useMemo(() => spline.getPoints(LINE_SEGMENTS), [spline]);
  const startPoint = points[0];

  const highlightSegments = useMemo(() => {
    if (!highlights || !highlights.length || !starts || !starts.length) return [];
    const controlPoints = (spline as any).points;
    return highlights
      .map((h) => {
        const lowIdx = bpToClosestIndex(starts, h.start);
        const highIdx = bpToClosestIndex(starts, h.end);
        const from = Math.max(0, Math.min(lowIdx, highIdx));
        const to = Math.min(controlPoints.length - 1, Math.max(lowIdx, highIdx));
        if (to <= from) return null;
        return {
          key: `${h.chrom}-${h.start}-${h.end}`,
          points: controlPoints.slice(from, to + 1),
          color: h.color || highlightColor,
        };
      })
      .filter(Boolean) as Array<{ key: string; points: any[]; color: string }>;
  }, [highlights, starts, spline, highlightColor]);

  return (
    <group>
      <Line points={points} color={color} lineWidth={1.5} />

      {highlightSegments.map((seg) => (
        <Line key={seg.key} points={seg.points} color={seg.color} lineWidth={5} />
      ))}

      {showLabel && (
        <Html position={startPoint} center style={{ marginTop: "-1em", color }} className="label">
          {chrom}
        </Html>
      )}
    </group>
  );
};

export const ThreeScene = ({ data, options, highlights = [], width, height }: ThreeSceneProps) => {
  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <Canvas
        camera={{ position: [0, 50, 200], fov: 50, near: 0.1, far: 10000 }}
        style={{ background: options.backgroundColor }}
      >
        {/* Lighting */}
        <hemisphereLight args={[0xddeeff, 0x202020, 8]} />
        <directionalLight position={[10, 10, 10]} intensity={5} color={0xffffff} />

        {/* Controls */}
        <OrbitControls makeDefault />

        {/* Render chromosome lines */}
        {data.map(({ chrom, spline, color, starts }) => (
          <ChromosomeLine
            key={chrom}
            chrom={chrom}
            spline={spline}
            starts={starts}
            color={color}
            showLabel={options.showChromLabels}
            highlightColor={options.highlightColor || "#ff2d55"}
            highlights={highlights.filter((h) => chrom === h.chrom || chrom.endsWith(`_${h.chrom}`))}
          />
        ))}
      </Canvas>
    </div>
  );
};
