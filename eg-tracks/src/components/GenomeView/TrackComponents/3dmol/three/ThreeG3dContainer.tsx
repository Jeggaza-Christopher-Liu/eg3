import React from "react";
import G3dFile from "../../../../../getRemoteData/g3dFileV2";
import TrackModel from "../../../../../models/TrackModel";
import DisplayedRegionModel from "../../../../../models/DisplayedRegionModel";
import { ThreeScene } from "./ThreeScene";
import { getSplinesFromG3dData, type SplineData, type G3dRawData, type HighlightRegion } from "./threeG3dUtil";
import "./ThreeG3dContainer.css";

/**
 * Drop-in replacement for ThreedmolContainer that renders the g3d structure
 * with the (react-three-fiber based) 3d_browser viewer instead of 3Dmol.js.
 *
 * Scope: loads the g3d file, renders chromosomes as colored splines with
 * optional labels, and highlights whatever region(s) the genome browser is
 * currently showing (kept in sync as the user navigates/zooms/selects a
 * region set). Painting (bigwig/compartment/annotation/expression), custom
 * shapes/arrows, image labels, the envelope, spin, resolution switching and
 * frame animation from the old 3Dmol viewer are not reimplemented here.
 */

interface ComponentProps {
  // kept so callers (GenomeRoot) don't need to change what they pass in;
  // unused ones are accepted and ignored for now.
  onToggleSync3d?: any;
  sync3d?: any;
  tracks: TrackModel[];
  g3dtrack: TrackModel;
  viewRegion: DisplayedRegionModel;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  imageInfo?: any;
  genomeConfig?: any;
  geneFor3d?: any;
  onSetSelected?: any;
  selectedSet?: any;
  onNewViewRegion?: any;
  anchors3d?: any;
  darkTheme?: any;
  onGetViewer3dAndNumFrames?: any;
}

interface ComponentState {
  splines: Record<string, SplineData>;
  loading: boolean;
  error: string | null;
  showChromLabels: boolean;
}

class ThreeG3dContainer extends React.Component<ComponentProps, ComponentState> {
  g3dFile: any;
  loadedKey: string | null;

  constructor(props: ComponentProps) {
    super(props);
    this.g3dFile = null;
    this.loadedKey = null;
    this.state = {
      splines: {},
      loading: true,
      error: null,
      showChromLabels: true,
    };
  }

  componentDidMount() {
    this.loadG3d();
  }

  componentDidUpdate(prevProps: ComponentProps) {
    if (prevProps.g3dtrack !== this.props.g3dtrack) {
      this.loadG3d();
    }
  }

  getSourceKey = () => {
    const { g3dtrack } = this.props;
    if (!g3dtrack) return null;
    return g3dtrack.fileObj ? g3dtrack.fileObj : g3dtrack.url;
  };

  loadG3d = async () => {
    const { g3dtrack } = this.props;
    const key = this.getSourceKey();
    if (!key || key === this.loadedKey) {
      return;
    }
    this.loadedKey = key;
    this.setState({ loading: true, error: null, splines: {} });
    if (!g3dtrack) {
      this.setState({
        loading: false,
        error: "cannot parse g3d file error, please check your file or contact the browser team.",
      });
      return;
    }
    const g3dconfig = g3dtrack.fileObj ? { blob: g3dtrack.fileObj } : { url: g3dtrack.url };
    try {
      this.g3dFile = new G3dFile(g3dconfig);
      await this.g3dFile.readHeader();
      const resolution = Math.max(...this.g3dFile.meta.resolutions);
      const data = (await this.g3dFile.readData(resolution)) as G3dRawData;
      const splines = getSplinesFromG3dData(data);
      this.setState({ splines, loading: false });
    } catch (error) {
      console.error(error);
      this.setState({
        loading: false,
        error: "parse g3d file error, please check your file or contact the browser team.",
      });
    }
  };

  toggleChromLabels = () => {
    this.setState((prev) => ({ showChromLabels: !prev.showChromLabels }));
  };

  /**
   * Same logic as the old ThreedmolContainer.viewRegionToRegions: turns the
   * browser's current view region (or the selected region set) into a list
   * of {chrom, start, end} regions to highlight in the 3D view.
   */
  viewRegionToRegions = (): Array<{ chrom: string; start: number; end: number }> => {
    const { viewRegion, genomeConfig, selectedSet } = this.props;
    if (!viewRegion || !genomeConfig) return [];
    const regions = viewRegion.getFeatureSegments();
    return regions.map((region: any) => {
      if (!selectedSet) {
        return {
          chrom: region.getName(),
          start: region.relativeStart,
          end: region.relativeEnd,
        };
      } else {
        return {
          chrom: region.feature.locus.chr,
          start: region.feature.locus.start,
          end: region.feature.locus.end,
        };
      }
    });
  };

  render() {
    const { width = 600, height = 400 } = this.props;
    const { splines, loading, error, showChromLabels } = this.state;

    if (error) {
      return (
        <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "crimson" }}>
          {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
          Loading and parsing g3d file...
        </div>
      );
    }

    const highlights: HighlightRegion[] = this.viewRegionToRegions();
    const data = Object.entries(splines).map(([chrom, splineData]) => ({ chrom, ...splineData }));

    return (
      <div className="three-g3d-container" style={{ width, height }}>
        <div className="three-g3d-toolbar">
          <label>
            <input type="checkbox" checked={showChromLabels} onChange={this.toggleChromLabels} />
            Show chromosome labels
          </label>
        </div>
        <ThreeScene
          data={data}
          options={{ backgroundColor: "white", showChromLabels }}
          highlights={highlights}
          width={width}
          height={height - 28}
        />
      </div>
    );
  }
}

export default ThreeG3dContainer;
