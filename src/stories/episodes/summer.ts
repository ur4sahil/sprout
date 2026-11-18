import type { Episode, SceneVisual } from '../types';
import { friend, option, page, prop, question, scene } from './build';

// "The Garden Year", summer: episodes 7 to 12. Each is a whole little story that ends settled.

// A garden clock at an hour: the short hand on the hour, the long hand on 12.
function clock(hour: number): SceneVisual {
  return { visual: { kind: 'clock', hour, minute: 0 }, at: 'middle' };
}

function kite(at: SceneVisual['at']): SceneVisual {
  return { visual: { kind: 'shape', shape: 'triangle', color: 'yellow', size: 'm', rotation: 0 }, at };
}

const PINK = '🌸';
const YELLOW = '🌻';

// 7. A gust of wind makes Pip lose his place in his flower chain; saying the pattern aloud finds it. Patterns.
const flowerChain: Episode = {
  id: 'garden-year-07-flower-chain',
  number: 7,
  title: 'The Flower Chain',
  season: 'summer',
  cover: PINK,
  pages: [
    page(
      'Summer was here, and the meadow was full of flowers. Pip was making a flower chain for a party.',
      scene('meadow', [friend('pip', 'talk', 'left')], [prop(PINK, 'right', 'near', 's', 3), prop(YELLOW, 'right', 'far', 's', 3)]),
    ),
    page('Pink, yellow, pink, yellow, went the flowers. Pip made a pattern!', scene('meadow', [friend('pip', 'cheer', 'left')], [prop([PINK, YELLOW, PINK, YELLOW], 'middle', 'near')])),
    page('A puff of wind made Pip spin around. “Oh dear, where was I?” he said.', scene('meadow', [friend('pip', 'think', 'left')], [prop([PINK, YELLOW, PINK, YELLOW], 'middle', 'near'), prop('🍃', 'right', 'sky')])),
    page('The chain ended with a pink flower. What should come next, pink or yellow?', scene('meadow', [friend('pip', 'think', 'left')], [prop([PINK, YELLOW, PINK, YELLOW, PINK], 'middle', 'near')])),
    page('Pip pointed and said the pattern out loud. “Pink, yellow, pink, yellow, pink...”', scene('meadow', [friend('pip', 'point', 'left')], [prop([PINK, YELLOW, PINK, YELLOW, PINK], 'middle', 'near')])),
    page('“Yellow comes next!” said Pip. He added a yellow flower to the chain.', scene('meadow', [friend('pip', 'cheer', 'left')], [prop([PINK, YELLOW, PINK, YELLOW, PINK, YELLOW], 'middle', 'near')])),
    page(
      'Pip kept going until the chain was long. Pink, yellow, pink, yellow, all the way!',
      scene('meadow', [friend('pip', 'cheer', 'left'), friend('sprout', 'greet', 'right', 'far')], [prop([PINK, YELLOW, PINK, YELLOW, PINK, YELLOW, PINK, YELLOW], 'middle', 'near', 's')]),
    ),
    page(
      'He hung the chain over the party table. Everyone said it was the prettiest party ever.',
      scene(
        'meadow',
        [friend('sprout', 'cheer', 'left'), friend('pip', 'cheerBig', 'middle'), friend('finn', 'cheer', 'right'), friend('olive', 'cheer', 'right', 'far')],
        [prop([PINK, YELLOW, PINK, YELLOW, PINK, YELLOW, PINK, YELLOW], 'middle', 'sky', 's'), prop('🎈', 'left', 'far'), prop('🧁', 'middle', 'far', 's', 3)],
      ),
    ),
  ],
  question: question('What came next after the pink flower?', [option('a yellow flower', YELLOW), option('a pink flower', PINK), option('a strawberry', '🍓')], 0, 'A yellow flower came after the pink flower.'),
};

// 8. Finn comes early to the picnic and reads the clock until it says three o'clock. Telling the time to the hour.
const picnicAtThree: Episode = {
  id: 'garden-year-08-picnic-at-three',
  number: 8,
  title: 'Picnic at Three',
  season: 'summer',
  cover: '⏰',
  pages: [
    page('Pip asked everyone to a picnic by the pond. “Come at [@3],” he said.', scene('pond', [friend('pip', 'talk', 'middle'), friend('olive', 'listen', 'left'), friend('finn', 'listen', 'right')], [prop('🧺', 'left', 'far')])),
    page('Finn was so excited that he came early. He looked at the big garden clock.', scene('pond', [friend('finn', 'greet', 'left')], [], { picture: clock(1) })),
    page('The short hand pointed to [1]. The long hand pointed to [12].', scene('pond', [friend('finn', 'think', 'left')], [], { picture: clock(1) })),
    page('It was only [@1]. Finn had to wait a while.', scene('pond', [friend('finn', 'idle', 'left')], [], { picture: clock(1) })),
    page('Finn took a nap on a lily pad. When he woke, the short hand was on [2].', scene('pond', [friend('finn', 'sleep', 'right')], [], { picture: clock(2) })),
    page('“Is it [@3] yet?” asked Finn. “Not yet, it is [@2],” said Olive.', scene('pond', [friend('finn', 'think', 'right'), friend('olive', 'talk', 'left')], [], { picture: clock(2) })),
    page('Finn helped Olive spread out the blanket. Then the short hand moved to [3].', scene('pond', [friend('finn', 'cheer', 'right'), friend('olive', 'cheer', 'left')], [prop('🧺', 'middle', 'near', 's')], { picture: clock(3) })),
    page(
      'Pip came with the food right at [@3]. The friends ate and laughed in the sun.',
      scene(
        'pond',
        [friend('pip', 'cheer', 'middle'), friend('finn', 'cheerBig', 'right'), friend('olive', 'cheer', 'left'), friend('sprout', 'cheer', 'right', 'far')],
        [prop('🍓', 'left', 'far', 's', 3), prop('🥪', 'middle', 'far', 's', 2)],
        { picture: clock(3) },
      ),
    ),
  ],
  question: question('What time was the picnic?', [option('[@1]'), option('[@2]'), option('[@3]')], 2, 'The picnic was at [@3].'),
};

// 9. Sprout comes to a fork in the path and reads a sign to find the pond. Reading a sign.
const signByThePath: Episode = {
  id: 'garden-year-09-sign-by-the-path',
  number: 9,
  title: 'The Sign by the Path',
  season: 'summer',
  cover: '🌲',
  pages: [
    page('Sprout wanted to visit Finn at the pond. Sprout walked and walked into the woods.', scene('woods', [friend('sprout', 'talk', 'middle')], [prop('🦋', 'right', 'sky', 's')])),
    page('Then the path split into [2] paths. Which way was the pond?', scene('woods', [friend('sprout', 'think', 'middle')])),
    page('Sprout saw a wooden sign by a tree. The sign had words on it.', scene('woods', [friend('sprout', 'point', 'right')], [], { sign: { words: 'To the pond', at: 'left' } })),
    page('Sprout read the words slowly, one at a time. The sign said, “To the pond.”', scene('woods', [friend('sprout', 'think', 'right')], [], { sign: { words: 'To the pond', at: 'left' } })),
    page('The sign stood by the path on the left. So Sprout went left.', scene('woods', [friend('sprout', 'greet', 'left')], [], { sign: { words: 'To the pond', at: 'left' } })),
    page('Soon Sprout heard a happy croak. There was Finn, sitting on a lily pad!', scene('pond', [friend('sprout', 'greet', 'left'), friend('finn', 'cheer', 'right', 'far')])),
    page('“How did you find me?” asked Finn. “I read the sign!” said Sprout.', scene('pond', [friend('sprout', 'cheer', 'left'), friend('finn', 'talk', 'right')])),
    page('Finn smiled a big frog smile. “Reading helps you go places,” he said.', scene('pond', [friend('sprout', 'cheer', 'left'), friend('finn', 'cheer', 'right')], [prop('☀️', 'middle', 'sky', 'm')])),
  ],
  question: question('What did the sign say?', [option('To the woods'), option('To the pond'), option('Stop')], 1, 'The sign said, “To the pond.”'),
};

// 10. Three sticks make a shape with three sides and three corners: a triangle kite. Shapes.
const triangleKite: Episode = {
  id: 'garden-year-10-triangle-kite',
  number: 10,
  title: 'The Triangle Kite',
  season: 'summer',
  cover: '🍃',
  pages: [
    page('It was a windy day in the meadow. Sprout and Pip wanted to fly a kite.', scene('meadow', [friend('sprout', 'talk', 'left'), friend('pip', 'greet', 'right')], [prop('🍃', 'middle', 'sky')])),
    page('Pip found [3] straight sticks and some string. “What shape can we make?” asked Sprout.', scene('meadow', [friend('sprout', 'think', 'left'), friend('pip', 'talk', 'right')], [prop('🧶', 'middle', 'near', 's')])),
    page('They put the sticks end to end. The sticks made [3] sides and [3] corners.', scene('meadow', [friend('sprout', 'point', 'left'), friend('pip', 'listen', 'right')], [], { picture: kite('middle') })),
    page('“A shape with [3] sides is a triangle,” said Pip. “A triangle kite!” said Sprout.', scene('meadow', [friend('sprout', 'cheer', 'left'), friend('pip', 'talk', 'right')], [], { picture: kite('middle') })),
    page('They covered the triangle with a big leaf. Then they tied on the string.', scene('meadow', [friend('sprout', 'listen', 'left'), friend('pip', 'talk', 'right')], [prop('🍃', 'middle', 'near', 'l'), prop('🧶', 'right', 'far', 's')], { picture: kite('middle') })),
    page('The wind lifted the kite up, up, up. Sprout held on to the string.', scene('meadow', [friend('sprout', 'cheer', 'left'), friend('pip', 'cheer', 'middle', 'far')], [], { picture: kite('right') })),
    page(
      'The kite danced over the flowers. Pip flew right beside it, laughing.',
      scene('meadow', [friend('sprout', 'cheer', 'left'), friend('pip', 'cheerBig', 'right', 'far')], [prop(PINK, 'middle', 'near', 's', 3), prop(YELLOW, 'right', 'near', 's', 2)], { picture: kite('middle') }),
    ),
    page('When the wind went to sleep, the kite came down. Sprout and Pip lay in the grass, smiling.', scene('meadow', [friend('sprout', 'idle', 'left'), friend('pip', 'idle', 'middle')], [], { picture: kite('right') })),
  ],
  question: question('How many sides did the kite have?', [option('[3]'), option('[4]'), option('[5]')], 0, 'The triangle kite had [3] sides.'),
};

// 11. The wind scatters Olive's row labels; the first letter of each plant's name puts them back. First letters.
const gardenLabels: Episode = {
  id: 'garden-year-11-garden-labels',
  number: 11,
  title: "Olive's Garden Labels",
  season: 'summer',
  cover: '🥕',
  pages: [
    page(
      'Olive made labels for the garden rows. Each label had the first letter of a plant.',
      scene('garden', [friend('olive', 'talk', 'left')], [prop('🥕', 'left', 'far', 's', 3), prop('🍅', 'middle', 'far', 's', 3), prop('🍓', 'right', 'far', 's', 3)]),
    ),
    page(
      'Then a big gust of wind came along. Whoosh went the labels, all over the garden!',
      scene('garden', [friend('olive', 'peek', 'left')], [prop('🍃', 'middle', 'sky'), prop('🥕', 'left', 'far', 's', 3), prop('🍅', 'middle', 'far', 's', 3), prop('🍓', 'right', 'far', 's', 3)]),
    ),
    page('Olive picked up [3] labels. They said [c], [t], and [s].', scene('garden', [friend('olive', 'think', 'left')], [], { sign: { words: 'C T S', at: 'middle' } })),
    page(
      'But which label went with which row? Olive said each plant name slowly.',
      scene('garden', [friend('olive', 'think', 'left')], [prop('🥕', 'left', 'far', 's', 3), prop('🍅', 'middle', 'far', 's', 3), prop('🍓', 'right', 'far', 's', 3)]),
    ),
    page('“Carrot starts with the letter [c],” said Olive. She put the [c] by the carrots.', scene('garden', [friend('olive', 'point', 'right')], [prop('🥕', 'left', 'near', 's', 3)], { sign: { words: 'C', at: 'left' } })),
    page('“Tomato starts with [t],” said Olive. The [t] went by the tomatoes.', scene('garden', [friend('olive', 'point', 'right')], [prop('🍅', 'middle', 'near', 's', 3)], { sign: { words: 'T', at: 'middle' } })),
    page('“And strawberry starts with [s]!” The last label went by the strawberries.', scene('garden', [friend('olive', 'cheer', 'left')], [prop('🍓', 'right', 'near', 's', 3)], { sign: { words: 'S', at: 'right' } })),
    page(
      'Pip came to look at the rows. “Now everyone knows what grows where!”',
      scene('garden', [friend('olive', 'cheer', 'left'), friend('pip', 'cheer', 'right')], [prop('🥕', 'left', 'far', 's', 3), prop('🍅', 'middle', 'far', 's', 3), prop('🍓', 'right', 'far', 's', 3)]),
    ),
  ],
  question: question('Which letter does tomato start with?', [option('[c]'), option('[s]'), option('[t]')], 2, 'Tomato starts with [t].'),
};

// 12. Finn wants to do it all at once; Olive helps the friends do things in order. The order of events.
const summerStars: Episode = {
  id: 'garden-year-12-summer-stars',
  number: 12,
  title: 'Under the Summer Stars',
  season: 'summer',
  cover: '🌙',
  pages: [
    page(
      'The friends planned a sleepout in the garden. They wanted to look at the stars.',
      scene('nightGarden', [friend('olive', 'talk', 'middle'), friend('finn', 'listen', 'left'), friend('pip', 'listen', 'right'), friend('sprout', 'listen', 'right', 'far')]),
    ),
    page('Finn wanted to do everything at once. He held the blanket, the snacks, and the tent!', scene('nightGarden', [friend('finn', 'cheer', 'middle'), friend('olive', 'think', 'left', 'far')], [prop('⛺', 'left', 'near', 's'), prop('🍪', 'right', 'near', 's', 2)])),
    page('“One thing at a time,” said Olive kindly. “First, we put up the tent.”', scene('nightGarden', [friend('olive', 'talk', 'left'), friend('finn', 'listen', 'right')], [prop('⛺', 'middle', 'far')])),
    page(
      'So first, they put up the tent. Next, they spread the blanket inside.',
      scene('nightGarden', [friend('olive', 'cheer', 'left'), friend('finn', 'cheer', 'right'), friend('pip', 'cheer', 'left', 'far'), friend('sprout', 'cheer', 'right', 'far')], [prop('⛺', 'middle', 'far', 'l')]),
    ),
    page('Then they ate their snacks. Finn ate his cookie in [2] big bites.', scene('nightGarden', [friend('olive', 'idle', 'left'), friend('finn', 'cheer', 'right')], [prop('🍪', 'middle', 'near', 's'), prop('⛺', 'middle', 'far')])),
    page(
      'Last, they lay on the grass and looked up. The sky was full of twinkly stars.',
      scene('nightGarden', [friend('olive', 'idle', 'left'), friend('finn', 'idle', 'middle'), friend('pip', 'idle', 'right')], [prop('⭐', 'left', 'sky', 's'), prop('🌟', 'middle', 'sky', 's'), prop('⭐', 'right', 'sky', 's')]),
    ),
    page('Finn counted the steps on his fingers. “Tent, blanket, snacks, then stars!”', scene('nightGarden', [friend('finn', 'think', 'middle'), friend('olive', 'listen', 'left')], [prop('⛺', 'right', 'far')])),
    page(
      'Pip and Sprout were already asleep. Olive hooted a soft goodnight to everyone.',
      scene('nightGarden', [friend('pip', 'sleep', 'left'), friend('sprout', 'sleep', 'right', 'far'), friend('olive', 'talk', 'middle'), friend('finn', 'sleep', 'right')], [prop('⛺', 'left', 'far')]),
    ),
  ],
  question: question('What did the friends do first?', [option('ate snacks', '🍪'), option('put up the tent', '⛺'), option('looked at the stars', '🌟')], 1, 'First, they put up the tent.'),
};

export const SUMMER: readonly Episode[] = [flowerChain, picnicAtThree, signByThePath, triangleKite, gardenLabels, summerStars];
