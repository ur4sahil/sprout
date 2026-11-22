import type { Visual } from '../engine/types';
import ArrayVisual from './ArrayVisual';
import BarVisual from './BarVisual';
import BaseTenVisual from './BaseTenVisual';
import ClipRowVisual from './ClipRowVisual';
import ClockVisual from './ClockVisual';
import CoinsVisual from './CoinsVisual';
import EmojiGroupVisual from './EmojiGroupVisual';
import EquationVisual from './EquationVisual';
import FigureVisual from './FigureVisual';
import FoldPunchVisual from './FoldPunchVisual';
import FractionVisual from './FractionVisual';
import GraphVisual from './GraphVisual';
import HoldersVisual from './HoldersVisual';
import LinePlotVisual from './LinePlotVisual';
import MatrixVisual from './MatrixVisual';
import MeasuredRectVisual from './MeasuredRectVisual';
import MeasuringCupVisual from './MeasuringCupVisual';
import NumberLineVisual from './NumberLineVisual';
import PairsVisual from './PairsVisual';
import RowVisual from './RowVisual';
import RulerVisual from './RulerVisual';
import ScaleVisual from './ScaleVisual';
import SequenceVisual from './SequenceVisual';
import ShapeVisual from './ShapeVisual';
import SolidVisual from './SolidVisual';
import TallyVisual from './TallyVisual';
import TenFrameVisual from './TenFrameVisual';
import TextVisual from './TextVisual';
import TwoRulersVisual from './TwoRulersVisual';

// Draws any Visual. Stimuli, answer options and explanations all go through here.
export default function VisualView({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'emojiGroup':
      return <EmojiGroupVisual visual={visual} />;
    case 'text':
      return <TextVisual visual={visual} />;
    case 'shape':
      return <ShapeVisual visual={visual} />;
    case 'solid':
      return <SolidVisual visual={visual} />;
    case 'tenFrame':
      return <TenFrameVisual visual={visual} />;
    case 'baseTen':
      return <BaseTenVisual visual={visual} />;
    case 'numberLine':
      return <NumberLineVisual visual={visual} />;
    case 'equation':
      return <EquationVisual visual={visual} />;
    case 'pairs':
      return <PairsVisual visual={visual} />;
    case 'sequence':
      return <SequenceVisual visual={visual} />;
    case 'matrix':
      return <MatrixVisual visual={visual} />;
    case 'clock':
      return <ClockVisual visual={visual} />;
    case 'coins':
      return <CoinsVisual visual={visual} />;
    case 'graph':
      return <GraphVisual visual={visual} />;
    case 'ruler':
      return <RulerVisual visual={visual} />;
    case 'fraction':
      return <FractionVisual visual={visual} />;
    case 'row':
      return <RowVisual visual={visual} />;
    case 'bar':
      return <BarVisual visual={visual} />;
    case 'array':
      return <ArrayVisual visual={visual} />;
    case 'tally':
      return <TallyVisual visual={visual} />;
    case 'figure':
      return <FigureVisual visual={visual} />;
    case 'scale':
      return <ScaleVisual visual={visual} />;
    case 'foldPunch':
      return <FoldPunchVisual visual={visual} />;
    case 'linePlot':
      return <LinePlotVisual visual={visual} />;
    case 'twoRulers':
      return <TwoRulersVisual visual={visual} />;
    case 'measuredRect':
      return <MeasuredRectVisual visual={visual} />;
    case 'holders':
      return <HoldersVisual visual={visual} />;
    case 'clipRow':
      return <ClipRowVisual visual={visual} />;
    case 'measuringCup':
      return <MeasuringCupVisual visual={visual} />;
  }
}
