// Grade 2 reading (plan section 8, Language Arts grade 2 D.1 to D.3): an authored bank. Each story is five
// short sentences. The right answer is first in each list here; the generator shuffles.

export interface StoryQuestion {
  ask: string;
  answers: [string, string, string]; // the right one first
  because: string; // the sentence of the story that answers it
}
export interface Story2 {
  id: string;
  text: string;
  who: StoryQuestion; // D.1 level 1: who or what
  why: StoryQuestion; // D.1 level 2: why or how
  title: [string, string, string]; // D.2 level 1: the best title first
  about: [string, string, string]; // D.2 level 2: what it is mostly about, first
  events: string[]; // D.3: what happens, in order (4 events)
}

export const STORIES_2: readonly Story2[] = [
  {
    id: 's2-01',
    text: 'Ana found a small bird under a tree. Its wing was hurt. She put it in a soft box. Her dad called the animal doctor. Soon the bird could fly again.',
    who: { ask: 'Who found the bird?', answers: ['Ana', 'Her dad', 'The animal doctor'], because: 'Ana found a small bird under a tree.' },
    why: { ask: 'Why did Ana put the bird in a box?', answers: ['Its wing was hurt.', 'It was cold.', 'It was hungry.'], because: 'Its wing was hurt. She put it in a soft box.' },
    title: ['Ana Helps a Bird', 'A Day at School', 'The Big Tree'],
    about: ['A girl helps a hurt bird get better.', 'A bird builds a nest.', 'A dad goes to work.'],
    events: ['Ana found a bird.', 'She put it in a box.', 'Her dad called the doctor.', 'The bird could fly again.'],
  },
  {
    id: 's2-02',
    text: 'Leo wanted to grow beans. He planted seeds in a cup of dirt. Every day he gave them water. After a week, a green sprout came up. Leo was so proud.',
    who: { ask: 'What did Leo plant?', answers: ['Bean seeds', 'A tree', 'Flowers'], because: 'Leo wanted to grow beans. He planted seeds in a cup of dirt.' },
    why: { ask: 'How did Leo take care of the seeds?', answers: ['He gave them water every day.', 'He put them in the fridge.', 'He sang to them.'], because: 'Every day he gave them water.' },
    title: ['Leo Grows a Bean', 'Leo Goes Swimming', 'The Lost Cup'],
    about: ['A boy plants a seed and watches it grow.', 'A boy eats beans for lunch.', 'A cup falls off the table.'],
    events: ['Leo planted seeds.', 'He watered them every day.', 'A sprout came up.', 'Leo was proud.'],
  },
  {
    id: 's2-03',
    text: 'It rained all morning. Mia and Ben could not play outside. They built a fort with chairs and a blanket. They read books inside the fort. By lunch the sun came out.',
    who: { ask: 'Who built the fort?', answers: ['Mia and Ben', 'Mia and her mom', 'Ben and his dog'], because: 'Mia and Ben could not play outside. They built a fort.' },
    why: { ask: 'Why could they not play outside?', answers: ['It rained all morning.', 'It was dark.', 'They were sick.'], because: 'It rained all morning.' },
    title: ['A Fort on a Rainy Day', 'A Trip to the Beach', 'Lunch Time'],
    about: ['Two children play inside when it rains.', 'Two children go to the park.', 'A blanket gets dirty.'],
    events: ['It rained.', 'Mia and Ben built a fort.', 'They read books in the fort.', 'The sun came out.'],
  },
  {
    id: 's2-04',
    text: 'Grandma baked bread on Sunday. Sam helped mix the flour and water. They let the dough rise for an hour. Then the bread baked in the oven. The whole house smelled good.',
    who: { ask: 'Who helped Grandma?', answers: ['Sam', 'Grandpa', 'The baker'], because: 'Sam helped mix the flour and water.' },
    why: { ask: 'Why did the house smell good?', answers: ['The bread was baking.', 'Flowers were in a vase.', 'It rained outside.'], because: 'Then the bread baked in the oven. The whole house smelled good.' },
    title: ['Baking Bread with Grandma', 'Sam Rides a Bike', 'The Broken Oven'],
    about: ['A boy and his grandma make bread.', 'A grandma goes shopping.', 'A boy cleans the house.'],
    events: ['Sam mixed flour and water.', 'The dough rose.', 'The bread baked.', 'The house smelled good.'],
  },
  {
    id: 's2-05',
    text: 'The class went to the zoo. First they saw the lions sleeping. Next they watched the seals swim. Then they ate lunch by the pond. Last, they waved goodbye to the giraffes.',
    who: { ask: 'What were the lions doing?', answers: ['Sleeping', 'Swimming', 'Eating lunch'], because: 'First they saw the lions sleeping.' },
    why: { ask: 'Where did the class eat lunch?', answers: ['By the pond', 'On the bus', 'At school'], because: 'Then they ate lunch by the pond.' },
    title: ['A Class Trip to the Zoo', 'The Lion King', 'A Day at the Pond'],
    about: ['A class visits animals at the zoo.', 'A seal learns to swim.', 'A giraffe is lost.'],
    events: ['They saw the lions.', 'They watched the seals.', 'They ate lunch.', 'They waved to the giraffes.'],
  },
  {
    id: 's2-06',
    text: 'Kim lost her red mitten at the park. She looked by the swings. She looked under the slide. Her friend Max found it in the sandbox. Kim gave Max a big hug.',
    who: { ask: 'Who found the mitten?', answers: ['Max', 'Kim', 'Kim’s mom'], because: 'Her friend Max found it in the sandbox.' },
    why: { ask: 'Why did Kim hug Max?', answers: ['He found her mitten.', 'It was his birthday.', 'He was sad.'], because: 'Max found it in the sandbox. Kim gave Max a big hug.' },
    title: ['The Lost Mitten', 'Fun on the Slide', 'Max Builds a Sandcastle'],
    about: ['A friend helps find a lost mitten.', 'Two friends go down a slide.', 'A girl buys new mittens.'],
    events: ['Kim lost her mitten.', 'She looked by the swings.', 'She looked under the slide.', 'Max found it.'],
  },
  {
    id: 's2-07',
    text: 'A little turtle wanted to see the sea. He walked slowly across the sand. A crab told him the way. At last he reached the water. The turtle swam away happy.',
    who: { ask: 'Who told the turtle the way?', answers: ['A crab', 'A bird', 'A fish'], because: 'A crab told him the way.' },
    why: { ask: 'How did the turtle cross the sand?', answers: ['He walked slowly.', 'He ran fast.', 'He flew.'], because: 'He walked slowly across the sand.' },
    title: ['The Turtle Finds the Sea', 'The Crab’s House', 'A Day of Rain'],
    about: ['A turtle travels to the sea.', 'A crab looks for food.', 'A turtle falls asleep.'],
    events: ['The turtle wanted to see the sea.', 'He walked across the sand.', 'He reached the water.', 'He swam away.'],
  },
  {
    id: 's2-08',
    text: 'Omar wanted a new kite. He saved his coins in a jar. After two months he had enough. He bought a blue kite at the store. On a windy day it flew high.',
    who: { ask: 'What did Omar want?', answers: ['A new kite', 'A new bike', 'A jar'], because: 'Omar wanted a new kite.' },
    why: { ask: 'How did Omar get the kite?', answers: ['He saved his coins.', 'It was a gift.', 'He found it.'], because: 'He saved his coins in a jar. After two months he had enough.' },
    title: ['Omar Saves for a Kite', 'The Windy Storm', 'A Jar of Candy'],
    about: ['A boy saves money to buy a kite.', 'A kite gets stuck in a tree.', 'A boy loses his coins.'],
    events: ['Omar wanted a kite.', 'He saved his coins.', 'He bought a kite.', 'The kite flew high.'],
  },
  {
    id: 's2-09',
    text: 'The puppy was afraid of the bath. Lily filled the tub with warm water. She gave the puppy a toy duck. The puppy played with the duck and forgot to be scared. Soon he was clean.',
    who: { ask: 'What did Lily give the puppy?', answers: ['A toy duck', 'A bone', 'A ball'], because: 'She gave the puppy a toy duck.' },
    why: { ask: 'Why did the puppy forget to be scared?', answers: ['He played with the duck.', 'The water was cold.', 'He fell asleep.'], because: 'The puppy played with the duck and forgot to be scared.' },
    title: ['Bath Time for Puppy', 'Lily’s New Duck', 'The Big Pond'],
    about: ['A girl helps her puppy feel brave in the bath.', 'A puppy runs away.', 'A duck swims in a pond.'],
    events: ['Lily filled the tub.', 'She gave the puppy a duck.', 'The puppy played.', 'The puppy was clean.'],
  },
  {
    id: 's2-10',
    text: 'Nina wanted to win the school race. She ran every day after school. On race day she ran as fast as she could. She came in second. Nina smiled because she did her best.',
    who: { ask: 'What place did Nina come in?', answers: ['Second', 'First', 'Last'], because: 'She came in second.' },
    why: { ask: 'Why did Nina smile?', answers: ['She did her best.', 'She won first place.', 'The race was cancelled.'], because: 'Nina smiled because she did her best.' },
    title: ['Nina Runs a Race', 'A Day Off School', 'The Fast Car'],
    about: ['A girl trains for a race and does her best.', 'A girl learns to swim.', 'A school gets a new playground.'],
    events: ['Nina ran every day.', 'Race day came.', 'She ran fast.', 'She came in second.'],
  },
];
