import type { Question, Response, Say } from '../engine/types';
import BuildBarItem from './BuildBarItem';
import ChoiceItem from './ChoiceItem';
import ColumnSumItem from './ColumnSumItem';
import DragWordItem from './DragWordItem';
import FillShapeItem from './FillShapeItem';
import MatchItem from './MatchItem';
import MultiSelectItem from './MultiSelectItem';
import NumberLineTapItem from './NumberLineTapItem';
import NumberPadItem from './NumberPadItem';
import OrderItem from './OrderItem';
import SetClockItem from './SetClockItem';
import SortItem from './SortItem';
import TapCountItem from './TapCountItem';
import TilesItem from './TilesItem';

interface Props {
  question: Question;
  disabled: boolean;
  onChange: (response: Response | null) => void;
  onSpeak: (say: Say) => void;
}

// The answer area for any question. Give it a `key` that changes with the question, so it starts fresh.
export default function ItemView({ question, ...rest }: Props) {
  switch (question.type) {
    case 'choice':
      return <ChoiceItem question={question} {...rest} />;
    case 'multiSelect':
      return <MultiSelectItem question={question} {...rest} />;
    case 'tapCount':
      return <TapCountItem question={question} {...rest} />;
    case 'numberPad':
      return <NumberPadItem question={question} {...rest} />;
    case 'order':
      return <OrderItem question={question} {...rest} />;
    case 'sort':
      return <SortItem question={question} {...rest} />;
    case 'match':
      return <MatchItem question={question} {...rest} />;
    case 'tiles':
      return <TilesItem question={question} {...rest} />;
    case 'numberLineTap':
      return <NumberLineTapItem question={question} {...rest} />;
    case 'setClock':
      return <SetClockItem question={question} {...rest} />;
    case 'buildBar':
      return <BuildBarItem question={question} {...rest} />;
    case 'columnSum':
      return <ColumnSumItem question={question} {...rest} />;
    case 'dragWord':
      return <DragWordItem question={question} {...rest} />;
    case 'fillShape':
      return <FillShapeItem question={question} {...rest} />;
  }
}
