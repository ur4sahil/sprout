import type { Episode } from '../types';
import { friend, option, page, prop, question, scene } from './build';

// "The Garden Year", spring: episodes 1 to 6. Each is a whole little story that ends settled.

// 1. Sprout counts the friends to know how many seeds to plant. Counting, and one more.
const fourSeeds: Episode = {
  id: 'garden-year-01-four-seeds',
  number: 1,
  title: 'Four Seeds',
  season: 'spring',
  cover: '🌱',
  pages: [
    page('Spring came to the garden. Sprout woke up and stretched.', scene('garden', [friend('sprout', 'greet', 'middle')], [prop('☀️', 'right', 'sky', 'l')])),
    page('Sprout had a basket of seeds. “I will plant a flower for each friend.”', scene('garden', [friend('sprout', 'talk', 'middle')], [prop('🧺', 'left', 'near')])),
    page(
      'But how many seeds should Sprout plant? Sprout counted the friends.',
      scene('garden', [friend('sprout', 'think', 'middle'), friend('pip', 'idle', 'left', 'far'), friend('olive', 'idle', 'right', 'far'), friend('finn', 'idle', 'left')]),
    ),
    page(
      'Pip was [1], Olive was [2], and Finn was [3].',
      scene('garden', [friend('sprout', 'point', 'middle'), friend('pip', 'cheer', 'left', 'far'), friend('olive', 'cheer', 'right', 'far'), friend('finn', 'cheer', 'left')]),
    ),
    page(
      '“And I make [1] more,” said Sprout. “That makes [4] friends in all!”',
      scene('garden', [friend('sprout', 'cheer', 'middle'), friend('pip', 'idle', 'left', 'far'), friend('olive', 'idle', 'right', 'far'), friend('finn', 'idle', 'left')]),
    ),
    page(
      'Sprout planted [4] seeds in a row. Then came the rain, and then the sun.',
      scene('garden', [friend('sprout', 'talk', 'left')], [prop('🌱', 'middle', 'near', 's', 4), prop('🌧️', 'left', 'sky', 'm'), prop('☀️', 'right', 'sky', 'm')]),
    ),
    page(
      '[1], [2], [3], [4] flowers popped up! There was a flower for each friend.',
      scene(
        'garden',
        [friend('sprout', 'cheerBig', 'left'), friend('pip', 'cheer', 'left', 'far'), friend('olive', 'cheer', 'right', 'far'), friend('finn', 'cheer', 'right')],
        [prop('🌸', 'middle', 'near', 'm', 4)],
      ),
    ),
    page(
      'The friends sat by their flowers. It was a happy spring day.',
      scene(
        'garden',
        [friend('sprout', 'idle', 'left'), friend('pip', 'idle', 'right'), friend('finn', 'idle', 'left', 'far'), friend('olive', 'idle', 'right', 'far')],
        [prop('🌸', 'middle', 'near', 'm', 4), prop('☀️', 'middle', 'sky', 'm')],
      ),
    ),
  ],
  question: question('How many seeds did Sprout plant?', [option('[3]'), option('[4]'), option('[5]')], 1, 'Sprout planted [4] seeds, [1] for each friend.'),
};

// 2. Pip deals out the berries [1] at a time, so everyone gets the same. Sharing equally: [8] shared by [4].
const fairShares: Episode = {
  id: 'garden-year-02-fair-shares',
  number: 2,
  title: 'Fair Shares',
  season: 'spring',
  cover: '🍓',
  pages: [
    page(
      'Pip found a bush full of red strawberries. He picked [8] and put them in a basket.',
      scene('meadow', [friend('pip', 'talk', 'left')], [prop('🍓', 'middle', 'near', 's', 8), prop('🧺', 'right', 'near')]),
    ),
    page(
      'His friends came to see. “Can we have some too?”',
      scene('meadow', [friend('pip', 'idle', 'left'), friend('sprout', 'talk', 'middle'), friend('finn', 'greet', 'right'), friend('olive', 'greet', 'right', 'far')], [prop('🧺', 'left', 'far')]),
    ),
    page(
      '“Of course,” said Pip with a smile. “But how can we share them fairly?”',
      scene('meadow', [friend('pip', 'think', 'middle'), friend('sprout', 'listen', 'left'), friend('finn', 'listen', 'right'), friend('olive', 'listen', 'right', 'far')], [prop('🍓', 'left', 'far', 's', 8)]),
    ),
    page(
      'With Pip, there were [4] friends and [8] berries. Pip gave each friend [1] berry.',
      scene('meadow', [friend('pip', 'talk', 'middle'), friend('sprout', 'listen', 'left'), friend('finn', 'listen', 'right'), friend('olive', 'listen', 'left', 'far')], [prop('🍓', 'middle', 'far', 's', 4)]),
    ),
    page(
      'Then he did it again, [1] more each. Now the basket was empty!',
      scene('meadow', [friend('pip', 'cheer', 'middle'), friend('sprout', 'idle', 'left'), friend('finn', 'idle', 'right'), friend('olive', 'idle', 'left', 'far')], [prop('🧺', 'middle', 'far')]),
    ),
    page(
      'Each friend had [2] berries. Nobody had more, and nobody had less.',
      scene(
        'meadow',
        [friend('pip', 'cheer', 'middle'), friend('sprout', 'cheer', 'left'), friend('finn', 'cheer', 'right'), friend('olive', 'cheer', 'left', 'far')],
        [prop('🍓', 'middle', 'far', 's', 2), prop('🍓', 'right', 'far', 's', 2)],
      ),
    ),
    page(
      '“That is fair!” said Finn. They all ate their berries.',
      scene('meadow', [friend('finn', 'cheer', 'right'), friend('pip', 'idle', 'middle'), friend('sprout', 'idle', 'left'), friend('olive', 'idle', 'left', 'far')]),
    ),
    page(
      'Pip had berry juice all over his face. Everyone laughed, even Pip.',
      scene('meadow', [friend('pip', 'cheerBig', 'middle'), friend('sprout', 'cheer', 'left'), friend('finn', 'cheer', 'right'), friend('olive', 'cheer', 'left', 'far')]),
    ),
  ],
  question: question('How many berries did each friend get?', [option('[1]'), option('[2]'), option('[4]')], 1, 'Each friend got [2] berries.'),
};

// 3. Finn needs a last line for his song that rhymes with frog. Rhymes.
const frogSong: Episode = {
  id: 'garden-year-03-frog-song',
  number: 3,
  title: "Finn's Frog Song",
  season: 'spring',
  cover: '🐸',
  pages: [
    page('Finn the frog loved to sing by the pond. Today he made up a new song.', scene('pond', [friend('finn', 'talk', 'left')])),
    page('“I am a frog,” Finn sang. “I sit on a log.”', scene('pond', [friend('finn', 'talk', 'left')], [prop('🦋', 'right', 'sky', 's')])),
    page('“Frog and log end the same!” said Pip. “That is called a rhyme.”', scene('pond', [friend('finn', 'listen', 'left'), friend('pip', 'talk', 'right', 'far')])),
    page('Then Finn sang some more. “I hop in the fog.”', scene('pond', [friend('finn', 'talk', 'left'), friend('pip', 'cheer', 'right', 'far')])),
    page('But Finn needed [1] more line to end the song. He thought and thought.', scene('pond', [friend('finn', 'think', 'left'), friend('pip', 'think', 'right', 'far')])),
    page('A puppy ran by the pond. “Woof!” said the puppy.', scene('pond', [friend('finn', 'peek', 'left'), friend('pip', 'idle', 'right', 'far')], [prop('🐶', 'right', 'near', 'l')])),
    page('Finn jumped up high. “Dog rhymes with frog!”', scene('pond', [friend('finn', 'cheerBig', 'left'), friend('pip', 'cheer', 'right', 'far')], [prop('🐶', 'right', 'near', 'l')])),
    page(
      '“I wave at a dog!” sang Finn. Everyone clapped, even the puppy.',
      scene('pond', [friend('finn', 'cheer', 'left'), friend('pip', 'cheer', 'right', 'far'), friend('sprout', 'cheer', 'middle', 'far')], [prop('🐶', 'right', 'near', 'l')]),
    ),
  ],
  question: question('Which word rhymes with frog?', [option('cat', '🐱'), option('fish', '🐟'), option('dog', '🐶')], 2, 'Dog rhymes with frog.'),
};

// 4. A short stick will not reach over the stream; a longer one does. Comparing lengths.
const stickBridge: Episode = {
  id: 'garden-year-04-stick-bridge',
  number: 4,
  title: 'The Stick Bridge',
  season: 'spring',
  cover: '🌳',
  pages: [
    page('Olive and Sprout went for a walk in the woods. They came to a little stream.', scene('woods', [friend('olive', 'talk', 'left'), friend('sprout', 'greet', 'middle')])),
    page('Sprout could not hop over the water. “My feet will get all wet!”', scene('woods', [friend('olive', 'listen', 'left'), friend('sprout', 'think', 'middle')])),
    page('Olive found [2] sticks under a tree. One was short, and the other was long.', scene('woods', [friend('olive', 'point', 'left'), friend('sprout', 'listen', 'right')])),
    page('They tried the short stick first. It fell into the water with a splash.', scene('woods', [friend('olive', 'encourage', 'left'), friend('sprout', 'think', 'right')], [prop('💧', 'middle', 'far', 's', 3)])),
    page('“We need a longer stick,” said Olive. “It must reach from side to side.”', scene('woods', [friend('olive', 'talk', 'left'), friend('sprout', 'listen', 'right')])),
    page('They laid the long stick over the water. It reached from side to side!', scene('woods', [friend('olive', 'point', 'left'), friend('sprout', 'cheer', 'right')])),
    page('Sprout walked across, slowly and carefully. Olive flew beside Sprout, just in case.', scene('woods', [friend('sprout', 'listen', 'middle'), friend('olive', 'encourage', 'right', 'far')])),
    page('“The longer stick made a bridge!” said Sprout. Then they went on with their walk.', scene('woods', [friend('sprout', 'cheer', 'middle'), friend('olive', 'cheer', 'right')], [prop('🦋', 'left', 'sky', 's')])),
  ],
  question: question('Which stick reached across the stream?', [option('the short stick'), option('the long stick')], 1, 'The long stick reached across the stream.'),
};

// 5. A rainy day in the treehouse, a game of opposites, and a wet ladybug made dry. Opposites.
const rainyDay: Episode = {
  id: 'garden-year-05-rainy-day',
  number: 5,
  title: 'The Rainy Day Game',
  season: 'spring',
  cover: '☂️',
  pages: [
    page('It rained and rained all day long. Pip and Olive stayed in the treehouse.', scene('treehouse', [friend('pip', 'idle', 'left'), friend('olive', 'idle', 'right')], [prop('🌧️', 'middle', 'sky', 'm')])),
    page('Pip looked out the window and sighed. “What can we do inside?”', scene('treehouse', [friend('pip', 'think', 'middle'), friend('olive', 'listen', 'right')], [prop('🌧️', 'middle', 'sky', 'm')])),
    page('“Let us play opposites,” said Olive. “I say up, and you say down.”', scene('treehouse', [friend('pip', 'listen', 'left'), friend('olive', 'talk', 'right')])),
    page('Olive said big, and Pip said little. Olive said hot, and Pip said cold.', scene('treehouse', [friend('pip', 'cheer', 'left'), friend('olive', 'talk', 'right')])),
    page('Olive said in, and Pip said out. Pip giggled and wiggled his wings.', scene('treehouse', [friend('pip', 'cheerBig', 'left'), friend('olive', 'cheer', 'right')])),
    page(
      'Pip peeked outside and got very wet. “Olive, what is the opposite of wet?”',
      scene('treehouse', [friend('pip', 'peek', 'middle'), friend('olive', 'listen', 'right')], [prop('🌧️', 'middle', 'sky', 'm'), prop('💧', 'left', 'far', 's', 3)]),
    ),
    page('“Dry!” said Olive, with a soft towel. Soon Pip was warm and dry again.', scene('treehouse', [friend('pip', 'cheer', 'left'), friend('olive', 'talk', 'right')])),
    page('Just then, the rain stopped. “The sun is out,” said Pip, “not in!”', scene('treehouse', [friend('pip', 'cheerBig', 'left'), friend('olive', 'cheer', 'right')], [prop('☀️', 'middle', 'sky', 'm')])),
  ],
  question: question('What is the opposite of wet?', [option('dry'), option('hot'), option('big')], 0, 'The opposite of wet is dry.'),
};

// 6. Finn knocks over the seed baskets and sorts the packets back into flowers and food. Sorting.
const seedMuddle: Episode = {
  id: 'garden-year-06-seed-muddle',
  number: 6,
  title: 'The Seed Muddle',
  season: 'spring',
  cover: '🌻',
  pages: [
    page('Sprout had [2] baskets of seed packets. [1] basket was for flowers, [1] for food.', scene('garden', [friend('sprout', 'talk', 'middle')], [prop('🧺', 'left', 'far'), prop('🧺', 'right', 'far')])),
    page('Finn hopped by, very fast. Bump went the baskets, all over the ground.', scene('garden', [friend('sprout', 'think', 'left'), friend('finn', 'greet', 'right')], [prop(['🥕', '🌻', '🍅', '🌸', '🌽'], 'middle', 'far', 's')])),
    page('The seed packets were all mixed up. “Oops, let me help you sort them,” said Finn.', scene('garden', [friend('sprout', 'listen', 'left'), friend('finn', 'encourage', 'right')], [prop(['🥕', '🌻', '🍅', '🌸', '🌽'], 'middle', 'far', 's')])),
    page(
      'Finn looked at the picture on each packet. Flowers go here, and food goes there.',
      scene('garden', [friend('finn', 'think', 'middle'), friend('sprout', 'listen', 'right')], [prop(['🥕', '🌻', '🍅', '🌸', '🌽'], 'middle', 'far', 's'), prop('🧺', 'left', 'far'), prop('🧺', 'right', 'far')]),
    ),
    page(
      'The sunflower packet went in the flower basket. So did the pink blossom packet.',
      scene('garden', [friend('finn', 'point', 'middle'), friend('sprout', 'listen', 'middle', 'far')], [prop('🧺', 'left', 'far'), prop(['🌻', '🌸'], 'left', 'near', 's'), prop('🧺', 'right', 'far'), prop(['🥕', '🍅', '🌽'], 'right', 'near', 's')]),
    ),
    page(
      'The carrot packet went in the food basket. So did the tomato and the corn.',
      scene('garden', [friend('finn', 'cheer', 'middle'), friend('sprout', 'listen', 'middle', 'far')], [prop('🧺', 'left', 'far'), prop(['🌻', '🌸'], 'left', 'near', 's'), prop('🧺', 'right', 'far'), prop(['🥕', '🍅', '🌽'], 'right', 'near', 's')]),
    ),
    page('“All sorted!” said Finn, with a happy hop. Sprout gave Finn a big leafy hug.', scene('garden', [friend('finn', 'cheerBig', 'middle'), friend('sprout', 'cheer', 'left')], [prop('🧺', 'right', 'far')])),
    page(
      'Sprout planted the flowers by the fence. The food went in neat rows.',
      scene('garden', [friend('sprout', 'idle', 'middle'), friend('finn', 'idle', 'right', 'far')], [prop(['🌻', '🌸', '🌻', '🌸'], 'left', 'far', 's'), prop(['🥕', '🍅', '🌽'], 'right', 'near', 's')]),
    ),
  ],
  question: question('Which packet went in the food basket?', [option('the sunflower', '🌻'), option('the carrot', '🥕'), option('the pink blossom', '🌸')], 1, 'The carrot packet went in the food basket.'),
};

export const SPRING: readonly Episode[] = [fourSeeds, fairShares, frogSong, stickBridge, rainyDay, seedMuddle];
