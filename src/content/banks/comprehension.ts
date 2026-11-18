// Reading comprehension, Kindergarten to grade 2 (plan section 8, curriculum gaps of Nov 17, 2026): an
// authored bank. In every answer list the right answer comes first; the generator shuffles.

export interface Pick3 {
  ask: string;
  answers: [string, string, string];
}
export interface PictureAnswer {
  ask: string;
  answers: [{ emoji: string; name: string }, { emoji: string; name: string }, { emoji: string; name: string }];
}

// Kindergarten: heard, never read. Answers are pictures.
export const K_STORIES: readonly { id: string; text: string; who: PictureAnswer; where: PictureAnswer }[] = [
  { id: 'k1', text: 'A pig rolled in the mud on the farm. The farmer gave it some corn. The pig was happy.', who: { ask: 'Which animal is in the story?', answers: [{ emoji: '🐷', name: 'pig' }, { emoji: '🐱', name: 'cat' }, { emoji: '🐟', name: 'fish' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🚜', name: 'farm' }, { emoji: '🏖️', name: 'beach' }, { emoji: '🏫', name: 'school' }] } },
  { id: 'k2', text: 'A crab walked on the beach. A big wave came. The crab hid in the sand.', who: { ask: 'Which animal is in the story?', answers: [{ emoji: '🦀', name: 'crab' }, { emoji: '🐷', name: 'pig' }, { emoji: '🐻', name: 'bear' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🏖️', name: 'beach' }, { emoji: '🚜', name: 'farm' }, { emoji: '🌲', name: 'woods' }] } },
  { id: 'k3', text: 'A bear lived in the woods. It found honey in a tree. The bear ate it all up.', who: { ask: 'Which animal is in the story?', answers: [{ emoji: '🐻', name: 'bear' }, { emoji: '🦀', name: 'crab' }, { emoji: '🐔', name: 'hen' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🌲', name: 'woods' }, { emoji: '🏫', name: 'school' }, { emoji: '🏖️', name: 'beach' }] } },
  { id: 'k4', text: 'Mia went to school. She read a book with her teacher. Then she played tag.', who: { ask: 'Who is the story about?', answers: [{ emoji: '👧', name: 'girl' }, { emoji: '👴', name: 'grandpa' }, { emoji: '🐶', name: 'dog' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🏫', name: 'school' }, { emoji: '🌲', name: 'woods' }, { emoji: '🚜', name: 'farm' }] } },
  { id: 'k5', text: 'A cat slept on the bed at home. A dog came in. The cat ran under the chair.', who: { ask: 'Who ran under the chair?', answers: [{ emoji: '🐱', name: 'cat' }, { emoji: '🐶', name: 'dog' }, { emoji: '🐷', name: 'pig' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🏠', name: 'home' }, { emoji: '🏖️', name: 'beach' }, { emoji: '🌲', name: 'woods' }] } },
  { id: 'k6', text: 'A fish swam in the sea. It saw a big shark. The fish swam fast to its rock.', who: { ask: 'Who swam fast to its rock?', answers: [{ emoji: '🐟', name: 'fish' }, { emoji: '🦈', name: 'shark' }, { emoji: '🐻', name: 'bear' }] }, where: { ask: 'Where does the story happen?', answers: [{ emoji: '🌊', name: 'sea' }, { emoji: '🏫', name: 'school' }, { emoji: '🏠', name: 'home' }] } },
  { id: 'k7', text: 'A duck lived on the farm. It swam in the pond each day. Its best friend was a cow.', who: { ask: 'Who is the duck’s best friend?', answers: [{ emoji: '🐄', name: 'cow' }, { emoji: '🦆', name: 'duck' }, { emoji: '🐟', name: 'fish' }] }, where: { ask: 'Where does the duck live?', answers: [{ emoji: '🚜', name: 'farm' }, { emoji: '🌊', name: 'sea' }, { emoji: '🏫', name: 'school' }] } },
  { id: 'k8', text: 'A boy made a snowman. He gave it a hat. Then he went home to get warm.', who: { ask: 'Who made the snowman?', answers: [{ emoji: '👦', name: 'boy' }, { emoji: '👵', name: 'grandma' }, { emoji: '🐱', name: 'cat' }] }, where: { ask: 'Where did the boy go to get warm?', answers: [{ emoji: '🏠', name: 'home' }, { emoji: '🏖️', name: 'beach' }, { emoji: '🌲', name: 'woods' }] } },
];

export const K_FACTS: readonly { id: string; text: string; first: PictureAnswer; later: PictureAnswer }[] = [
  { id: 'kf1', text: 'Bees can fly. Bees make honey. Bees live in a hive.', first: { ask: 'What can bees do?', answers: [{ emoji: '🪽', name: 'fly' }, { emoji: '🏊', name: 'swim' }, { emoji: '📖', name: 'read' }] }, later: { ask: 'What do bees make?', answers: [{ emoji: '🍯', name: 'honey' }, { emoji: '🥛', name: 'milk' }, { emoji: '🥚', name: 'eggs' }] } },
  { id: 'kf2', text: 'Cows live on farms. Cows eat grass. Cows give us milk.', first: { ask: 'What do cows eat?', answers: [{ emoji: '🌿', name: 'grass' }, { emoji: '🐟', name: 'fish' }, { emoji: '🍕', name: 'pizza' }] }, later: { ask: 'What do cows give us?', answers: [{ emoji: '🥛', name: 'milk' }, { emoji: '🍯', name: 'honey' }, { emoji: '🍎', name: 'apples' }] } },
  { id: 'kf3', text: 'Hens live on farms. Hens lay eggs. Hens peck at seeds.', first: { ask: 'What do hens lay?', answers: [{ emoji: '🥚', name: 'eggs' }, { emoji: '🍯', name: 'honey' }, { emoji: '🧀', name: 'cheese' }] }, later: { ask: 'What do hens peck at?', answers: [{ emoji: '🌱', name: 'seeds' }, { emoji: '🍕', name: 'pizza' }, { emoji: '⚽', name: 'balls' }] } },
  { id: 'kf4', text: 'Fish live in water. Fish swim with fins. Fish eat little bugs.', first: { ask: 'Where do fish live?', answers: [{ emoji: '🌊', name: 'water' }, { emoji: '🌳', name: 'trees' }, { emoji: '🏜️', name: 'desert' }] }, later: { ask: 'What do fish eat?', answers: [{ emoji: '🐛', name: 'bugs' }, { emoji: '🍕', name: 'pizza' }, { emoji: '🧀', name: 'cheese' }] } },
  { id: 'kf5', text: 'Frogs can jump far. Frogs eat bugs. Frogs like ponds.', first: { ask: 'What can frogs do?', answers: [{ emoji: '🦘', name: 'jump' }, { emoji: '🪽', name: 'fly' }, { emoji: '📖', name: 'read' }] }, later: { ask: 'What do frogs eat?', answers: [{ emoji: '🐛', name: 'bugs' }, { emoji: '🍌', name: 'bananas' }, { emoji: '🥕', name: 'carrots' }] } },
  { id: 'kf6', text: 'Squirrels live in trees. Squirrels eat nuts. They hide nuts for winter.', first: { ask: 'Where do squirrels live?', answers: [{ emoji: '🌳', name: 'trees' }, { emoji: '🌊', name: 'water' }, { emoji: '🏜️', name: 'desert' }] }, later: { ask: 'What do squirrels eat?', answers: [{ emoji: '🥜', name: 'nuts' }, { emoji: '🐟', name: 'fish' }, { emoji: '🍕', name: 'pizza' }] } },
  { id: 'kf7', text: 'Bears are big. Bears sleep all winter. Bears eat fish and berries.', first: { ask: 'What do bears do all winter?', answers: [{ emoji: '😴', name: 'sleep' }, { emoji: '🏊', name: 'swim' }, { emoji: '⚽', name: 'play ball' }] }, later: { ask: 'What do bears eat?', answers: [{ emoji: '🐟', name: 'fish' }, { emoji: '🍕', name: 'pizza' }, { emoji: '🍩', name: 'donuts' }] } },
  { id: 'kf8', text: 'Birds have wings. Birds build nests. Birds lay eggs in the nest.', first: { ask: 'What do birds have?', answers: [{ emoji: '🪽', name: 'wings' }, { emoji: '🐟', name: 'fins' }, { emoji: '🐘', name: 'trunks' }] }, later: { ask: 'What do birds build?', answers: [{ emoji: '🪺', name: 'nests' }, { emoji: '🏰', name: 'castles' }, { emoji: '🚗', name: 'cars' }] } },
];

// Grade 1: read. Four short sentences each.
export interface Story1 {
  id: string;
  text: string;
  who: Pick3; // a character
  where: Pick3; // the setting
  events: [string, string, string]; // in order
  truth: [string, string, string]; // the true sentence first, then two that are not true
}
export const G1_STORIES: readonly Story1[] = [
  { id: 'g1s1', text: 'Tom has a red ball. He kicks it to the park. His dog runs after it. Tom and his dog play all day.', who: { ask: 'Who runs after the ball?', answers: ['the dog', 'the cat', 'Mom'] }, where: { ask: 'Where do they play?', answers: ['at the park', 'at school', 'at the beach'] }, events: ['Tom kicks the ball.', 'The dog runs after it.', 'They play all day.'], truth: ['Tom has a red ball.', 'Tom has a blue ball.', 'The dog is sad.'] },
  { id: 'g1s2', text: 'Kim and her mom go to the beach. Kim digs in the sand. She finds a pink shell. Mom says it is pretty.', who: { ask: 'Who goes with Kim?', answers: ['her mom', 'her dad', 'her friend'] }, where: { ask: 'Where do they go?', answers: ['to the beach', 'to the farm', 'to the store'] }, events: ['They go to the beach.', 'Kim digs in the sand.', 'She finds a shell.'], truth: ['Kim finds a pink shell.', 'Kim finds a fish.', 'They go to the park.'] },
  { id: 'g1s3', text: 'Ben feeds the hens on the farm. Then he milks the cow. He gets eggs for lunch. Ben likes the farm.', who: { ask: 'Who feeds the hens?', answers: ['Ben', 'Kim', 'Tom'] }, where: { ask: 'Where is Ben?', answers: ['on the farm', 'at school', 'in the city'] }, events: ['Ben feeds the hens.', 'He milks the cow.', 'He gets eggs for lunch.'], truth: ['Ben milks the cow.', 'Ben feeds the dog.', 'Ben does not like the farm.'] },
  { id: 'g1s4', text: 'It is the first day of school. Sam meets his new teacher. He sits by a boy named Max. Now Sam has a new friend.', who: { ask: 'Who is Sam’s new friend?', answers: ['Max', 'Ben', 'his teacher'] }, where: { ask: 'Where is Sam?', answers: ['at school', 'at the beach', 'on a farm'] }, events: ['Sam meets his teacher.', 'He sits by Max.', 'Sam has a new friend.'], truth: ['Sam sits by Max.', 'It is the last day of school.', 'Sam has no friends.'] },
  { id: 'g1s5', text: 'A little fox lives in the woods. One night it is cold. The fox digs a den. It sleeps in the warm den.', who: { ask: 'Who is the story about?', answers: ['a little fox', 'a big bear', 'a girl'] }, where: { ask: 'Where does the fox live?', answers: ['in the woods', 'in a house', 'in the sea'] }, events: ['It is cold.', 'The fox digs a den.', 'It sleeps in the den.'], truth: ['The fox digs a den.', 'The fox swims in the sea.', 'It is a hot night.'] },
  { id: 'g1s6', text: 'Nan bakes a cake in the kitchen. She puts on pink frosting. Her grandson eats a big slice. He says it is the best cake.', who: { ask: 'Who eats a slice?', answers: ['her grandson', 'her cat', 'her friend'] }, where: { ask: 'Where does Nan bake?', answers: ['in the kitchen', 'in the yard', 'at school'] }, events: ['Nan bakes a cake.', 'She puts on frosting.', 'Her grandson eats a slice.'], truth: ['The frosting is pink.', 'The frosting is green.', 'Nan makes soup.'] },
  { id: 'g1s7', text: 'Lin rides her bike to the lake. She sees ducks on the water. She gives them bread. Then she rides home.', who: { ask: 'Who rides a bike?', answers: ['Lin', 'Nan', 'a duck'] }, where: { ask: 'Where does Lin go?', answers: ['to the lake', 'to the zoo', 'to the store'] }, events: ['Lin rides to the lake.', 'She feeds the ducks.', 'She rides home.'], truth: ['Lin sees ducks.', 'Lin sees a lion.', 'Lin walks to the lake.'] },
  { id: 'g1s8', text: 'Max and Dad go to the zoo. They see a tall giraffe. Then they see a big lion. Max likes the lion best.', who: { ask: 'Who goes with Max?', answers: ['Dad', 'Mom', 'Nan'] }, where: { ask: 'Where do they go?', answers: ['to the zoo', 'to the lake', 'to the farm'] }, events: ['They see a giraffe.', 'They see a lion.', 'Max likes the lion best.'], truth: ['Max likes the lion best.', 'Max likes the giraffe best.', 'They go to the beach.'] },
];

// Fact texts: what each is mostly about (first), and a fact question.
export interface FactText {
  id: string;
  text: string;
  topic: [string, string, string];
  fact: Pick3;
}
export const G1_FACTS: readonly FactText[] = [
  { id: 'g1f1', text: 'Apples grow on trees. They can be red, green or yellow. You can eat them or make juice.', topic: ['apples', 'trees', 'juice boxes'], fact: { ask: 'Where do apples grow?', answers: ['on trees', 'under the ground', 'in the sea'] } },
  { id: 'g1f2', text: 'Owls hunt at night. They have big eyes. They can turn their heads far around.', topic: ['owls', 'the night sky', 'eyes'], fact: { ask: 'When do owls hunt?', answers: ['at night', 'in the morning', 'at lunch'] } },
  { id: 'g1f3', text: 'Rain falls from clouds. Plants need rain to grow. After rain we may see a rainbow.', topic: ['rain', 'rainbows', 'plants'], fact: { ask: 'What do plants need to grow?', answers: ['rain', 'snow', 'sand'] } },
  { id: 'g1f4', text: 'A fire truck is red. It has a long ladder. Firefighters ride it to put out fires.', topic: ['fire trucks', 'ladders', 'the color red'], fact: { ask: 'What does a fire truck have?', answers: ['a long ladder', 'a big sail', 'wings'] } },
  { id: 'g1f5', text: 'Penguins are birds. They can not fly. They swim fast in cold water.', topic: ['penguins', 'cold water', 'flying'], fact: { ask: 'What can penguins not do?', answers: ['fly', 'swim', 'walk'] } },
  { id: 'g1f6', text: 'The sun is a star. It gives us light. It keeps the Earth warm.', topic: ['the sun', 'the moon', 'light bulbs'], fact: { ask: 'What does the sun give us?', answers: ['light', 'rain', 'snow'] } },
];

export const G2_FACTS: readonly FactText[] = [
  { id: 'g2f1', text: 'Butterflies start as tiny eggs. A caterpillar hatches and eats leaves. It makes a chrysalis. Weeks later, a butterfly comes out.', topic: ['how a butterfly grows', 'what caterpillars eat', 'where leaves come from'], fact: { ask: 'What does a caterpillar eat?', answers: ['leaves', 'seeds', 'bugs'] } },
  { id: 'g2f2', text: 'Volcanoes are mountains with hot melted rock inside. When they erupt, the rock flows out as lava. Lava cools and turns hard. Some islands were made this way.', topic: ['volcanoes', 'islands in the sea', 'hard rocks'], fact: { ask: 'What happens when lava cools?', answers: ['it turns hard', 'it turns to water', 'it gets hotter'] } },
  { id: 'g2f3', text: 'Honeybees live in a hive. The queen lays the eggs. Worker bees collect nectar from flowers. They turn the nectar into honey.', topic: ['how honeybees live and work', 'how flowers grow', 'the queen of a country'], fact: { ask: 'Who lays the eggs?', answers: ['the queen', 'the worker bees', 'the flowers'] } },
  { id: 'g2f4', text: 'Your heart is a muscle. It pumps blood all around your body. It beats faster when you run. Exercise keeps it strong.', topic: ['the heart', 'running races', 'how to eat well'], fact: { ask: 'When does your heart beat faster?', answers: ['when you run', 'when you sleep', 'when you read'] } },
  { id: 'g2f5', text: 'Desert plants need little water. A cactus stores water in its thick stem. Its sharp spines keep animals away. It can live for a long time without rain.', topic: ['how desert plants live', 'animals of the desert', 'rainy days'], fact: { ask: 'Where does a cactus store water?', answers: ['in its stem', 'in its spines', 'in the sand'] } },
  { id: 'g2f6', text: 'The moon goes around the Earth. It has no light of its own. It shines with light from the sun. Its shape seems to change each night.', topic: ['the moon', 'the sun', 'the stars'], fact: { ask: 'Where does the moon’s light come from?', answers: ['the sun', 'the stars', 'its own fire'] } },
];

// Grade 2: a word worked out from the sentence around it.
export const CONTEXT_WORDS: readonly { sentence: string; word: string; answers: [string, string, string] }[] = [
  { sentence: 'The puppy was so tiny that it fit in my hand.', word: 'tiny', answers: ['very small', 'very loud', 'very fast'] },
  { sentence: 'After the long race, Sam was exhausted and lay down to rest.', word: 'exhausted', answers: ['very tired', 'very happy', 'very hungry'] },
  { sentence: 'The soup was scalding, so we waited for it to cool.', word: 'scalding', answers: ['very hot', 'very cold', 'very salty'] },
  { sentence: 'Mia was furious when her brother broke her toy.', word: 'furious', answers: ['very angry', 'very sleepy', 'very proud'] },
  { sentence: 'The old bridge was fragile, so only one person could cross at a time.', word: 'fragile', answers: ['easy to break', 'very new', 'very long'] },
  { sentence: 'The baby was drowsy and soon fell asleep.', word: 'drowsy', answers: ['sleepy', 'hungry', 'noisy'] },
  { sentence: 'The giant whale was enormous next to our little boat.', word: 'enormous', answers: ['very big', 'very wet', 'very kind'] },
  { sentence: 'We had to hurry because the bus was about to depart.', word: 'depart', answers: ['leave', 'stop', 'break'] },
  { sentence: 'The ice on the path was slick, and Dad almost fell.', word: 'slick', answers: ['slippery', 'sticky', 'bumpy'] },
  { sentence: 'Ben was famished after skipping lunch.', word: 'famished', answers: ['very hungry', 'very cold', 'very late'] },
];
