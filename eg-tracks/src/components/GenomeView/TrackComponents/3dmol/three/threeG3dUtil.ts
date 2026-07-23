import { Vector3, CatmullRomCurve3 } from "three";
import { chromColors } from "../helpers-3dmol";

export interface SplineData {
  spline: CatmullRomCurve3;
  color: string;
  starts: number[];
}

export interface HighlightRegion {
  chrom: string;
  start: number;
  end: number;
  color?: string;
}

export type G3dChromData = { x: number[]; y: number[]; z: number[]; start: number[] };
export type G3dRawData = Record<string, Record<string, G3dChromData>>;

function getScale3d(num: number): number {
  const mag = Math.floor(Math.log10(Math.abs(num) || 1));
  return 10 ** (mag - 1);
}

function numToHexColor(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

export function colorForChromKey(chrKey: string, index: number, total: number): string {
  if (Object.prototype.hasOwnProperty.call(chromColors, chrKey)) {
    return numToHexColor((chromColors as Record<string, number>)[chrKey]);
  }
  return `hsl(${Math.round((index * 360) / Math.max(total, 1))}, 80%, 60%)`;
}

export function getSplinesFromG3dData(data: G3dRawData): Record<string, SplineData> {
  if (!data || !Object.keys(data).length) {
    console.error("error: data for splines is empty");
    return {};
  }

  const haps = Object.keys(data);
  const multiHap = haps.length > 1;
  const entries: Array<{ hap: string; chr: string; chromData: G3dChromData }> = [];
  haps.forEach((hap) => {
    Object.keys(data[hap]).forEach((chr) => {
      entries.push({ hap, chr, chromData: data[hap][chr] });
    });
  });

  const splines: Record<string, SplineData> = {};

  entries.forEach(({ hap, chr, chromData }, index) => {
    if (!chromData || !chromData.x || chromData.x.length < 2) return;

    const scale = getScale3d(
      Math.max(Math.abs(chromData.x[0]), Math.abs(chromData.y[0]), Math.abs(chromData.z[0])),
    );
    const points = chromData.x.map(
      (_x, i) => new Vector3(chromData.x[i] / scale, chromData.y[i] / scale, chromData.z[i] / scale),
    );
    const spline = new CatmullRomCurve3(points);
    const color = colorForChromKey(chr, index, entries.length);
    let key = chr;
    if (multiHap) {
      key = `${hap}_${chr}`;
    }
    splines[key] = { spline, color, starts: chromData.start };
  });

  return splines;
}


export function bpToClosestIndex(starts: number[], bp: number): number {
  if (!starts || !starts.length) return 0;
  let low = 0;
  let high = starts.length - 1;
  if (bp <= starts[0]) return 0;
  if (bp >= starts[high]) return high;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (starts[mid] <= bp) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const distLow = bp - starts[low];
  const distHigh = starts[high] - bp;
  if (distLow <= distHigh) {
    return low;
  } else {
    return high;
  }
}
