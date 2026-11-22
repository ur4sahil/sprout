// Short texts of plan section 15 wave H4 (Language Arts grades 1 and 2). In every answer list the right
// answer comes first; the generators shuffle. Names are made up.

// ---- Grade 1 D.6 Story or facts ----
export const STORY_TEXTS: readonly { id: string; text: string }[] = [
  { id: 'st1', text: 'Pip the pup lost his bone. He looked under the bed. At last he found it in the yard.' },
  { id: 'st2', text: 'Ana got a new red bike. She rode it to Nan’s house. Nan clapped and cheered.' },
  { id: 'st3', text: 'A little bug wanted to see the sea. It rode on a leaf down the river. Soon it saw the waves.' },
  { id: 'st4', text: 'Max made a sand castle. A big wave came in. Max laughed and made a new one.' },
  { id: 'st5', text: 'The hen found a seed. She planted it in the dirt. It grew into a tall plant.' },
  { id: 'st6', text: 'Jo could not sleep. She counted sheep. By ten she was fast asleep.' },
  { id: 'st7', text: 'Two frogs had a race to the pond. The small frog hopped and hopped. The small frog won!' },
  { id: 'st8', text: 'Tess found a kitten in the rain. She took it home and dried it. Now it is her pet.' },
];
export const FACT_TEXTS: readonly { id: string; text: string }[] = [
  { id: 'ft1', text: 'Frogs live near water. They eat bugs. A frog can jump very far.' },
  { id: 'ft2', text: 'The sun is a star. It gives us light. It is very hot.' },
  { id: 'ft3', text: 'Cows eat grass. Cows give us milk. A baby cow is a calf.' },
  { id: 'ft4', text: 'Bees make honey. They live in a hive. Bees help flowers grow.' },
  { id: 'ft5', text: 'Snow is made of ice. It falls when it is cold. Each flake has six sides.' },
  { id: 'ft6', text: 'Owls hunt at night. They have big eyes. Owls can turn their heads far.' },
  { id: 'ft7', text: 'A seed needs water to grow. It needs sun too. Then it turns into a plant.' },
  { id: 'ft8', text: 'Whales live in the sea. They breathe air. A whale is not a fish.' },
];
// One sentence of each kind, for "which sentence is from a fact book".
export const STORY_SENTENCES: readonly string[] = [
  'Pip the pup lost his bone.',
  'Ana rode her bike to Nan’s house.',
  'The little bug rode on a leaf.',
  'Max laughed and made a new castle.',
  'Jo counted sheep in her bed.',
  'Tess took the kitten home.',
];
export const FACT_SENTENCES: readonly string[] = [
  'Frogs live near water.',
  'The sun is a star.',
  'Cows give us milk.',
  'Bees make honey.',
  'Snow is made of ice.',
  'Owls hunt at night.',
  'Whales breathe air.',
  'A seed needs water to grow.',
];

// ---- Grade 1 D.7 Who is telling the story ----
// The teller says I. The right answer comes first.
export const TOLD_BY_ME: readonly { id: string; text: string; teller: readonly [string, string, string] }[] = [
  { id: 'tb1', text: 'I am a little frog. I sit on a log all day. When a fly comes by, I eat it!', teller: ['a frog', 'a fly', 'a log'] },
  { id: 'tb2', text: 'I am a red kite. A girl holds my string. The wind lifts me up to the sky.', teller: ['a kite', 'a girl', 'the wind'] },
  { id: 'tb3', text: 'My name is Ben. My dog Rex likes to dig. Today I helped him dig a hole.', teller: ['Ben', 'Rex', 'a hole'] },
  { id: 'tb4', text: 'I am an old shoe. A boy wore me every day. Now I sit in the box.', teller: ['a shoe', 'a boy', 'a box'] },
  { id: 'tb5', text: 'I am a bee. I fly from flower to flower. I bring food back to my hive.', teller: ['a bee', 'a flower', 'a hive'] },
  { id: 'tb6', text: 'I am Nan. My grandson came to visit. We baked a cake and ate it all.', teller: ['Nan', 'her grandson', 'a cake'] },
  { id: 'tb7', text: 'I am a snowman. Kids made me today. I hope the sun does not come out!', teller: ['a snowman', 'the kids', 'the sun'] },
  { id: 'tb8', text: 'My name is Lin. I lost my first tooth. I put it under my bed for the tooth fairy.', teller: ['Lin', 'the tooth fairy', 'a tooth'] },
];
// Told by someone outside the story: no I, me or my.
export const TOLD_BY_OTHER: readonly { id: string; text: string }[] = [
  { id: 'to1', text: 'A frog sat on a log. A fly came by. The frog ate it.' },
  { id: 'to2', text: 'Ben has a dog named Rex. Rex likes to dig. Today Ben helped him.' },
  { id: 'to3', text: 'The bee flew from flower to flower. It took food back to the hive.' },
  { id: 'to4', text: 'Lin lost her first tooth. She put it under her bed.' },
  { id: 'to5', text: 'The kids made a snowman. They gave it a hat. Then the sun came out.' },
  { id: 'to6', text: 'Nan baked a cake. Her grandson ate a big slice.' },
];
export const TELLERS: readonly [string, string] = ['A character in the story', 'Someone outside the story'];

// ---- Grade 1 D.8 Feelings in a story ----
export const FEELINGS: readonly string[] = ['happy', 'sad', 'scared', 'angry', 'tired'];
export const FEELING_TEXTS: readonly { id: string; text: string; who: string; feeling: string; clue: string }[] = [
  { id: 'fe1', text: 'Ana lost her kite in a tree. She cried and cried.', who: 'Ana', feeling: 'sad', clue: 'She cried and cried.' },
  { id: 'fe2', text: 'Max got a puppy for his birthday. He jumped up and down and laughed.', who: 'Max', feeling: 'happy', clue: 'He jumped up and down and laughed.' },
  { id: 'fe3', text: 'It was dark and the wind howled. Kim hid under her blanket and shook.', who: 'Kim', feeling: 'scared', clue: 'Kim hid under her blanket and shook.' },
  { id: 'fe4', text: 'Ben’s little brother broke his tower. Ben stomped his feet and yelled.', who: 'Ben', feeling: 'angry', clue: 'Ben stomped his feet and yelled.' },
  { id: 'fe5', text: 'Lin played all day at the beach. At night she yawned and rubbed her eyes.', who: 'Lin', feeling: 'tired', clue: 'At night she yawned and rubbed her eyes.' },
  { id: 'fe6', text: 'Sam won the race. He smiled from ear to ear.', who: 'Sam', feeling: 'happy', clue: 'He smiled from ear to ear.' },
  { id: 'fe7', text: 'Jo’s best friend moved away. Jo sat alone and a tear ran down her face.', who: 'Jo', feeling: 'sad', clue: 'Jo sat alone and a tear ran down her face.' },
  { id: 'fe8', text: 'A big dog ran at Tess and barked. Tess froze and her heart beat fast.', who: 'Tess', feeling: 'scared', clue: 'Tess froze and her heart beat fast.' },
  { id: 'fe9', text: 'Someone ate Max’s last cookie. Max crossed his arms and frowned.', who: 'Max', feeling: 'angry', clue: 'Max crossed his arms and frowned.' },
  { id: 'fe10', text: 'Dad worked in the garden all day. He sat down and his eyes began to close.', who: 'Dad', feeling: 'tired', clue: 'He sat down and his eyes began to close.' },
];

// ---- Grade 2 D.7 Text features ----
// The clue comes first in each question ("Which part at the back of a book..."), and each question has one
// answer: what a book is about could be in its table of contents too, so the title question asks for its name.
export const FEATURES: readonly string[] = ['title', 'heading', 'caption', 'label', 'glossary', 'table of contents', 'bold word'];
export const FEATURE_WHAT: readonly { feature: string; ask: string }[] = [
  { feature: 'title', ask: 'Which part gives the name of the whole book?' },
  { feature: 'heading', ask: 'Which part tells what one part of the page is about?' },
  { feature: 'caption', ask: 'Which part is a sentence under a picture that tells about it?' },
  { feature: 'label', ask: 'Which part names the parts of a picture?' },
  { feature: 'glossary', ask: 'Which part at the back of a book tells what hard words mean?' },
  { feature: 'table of contents', ask: 'Which part at the front of a book lists the topics and their pages?' },
  { feature: 'bold word', ask: 'Which part is a word printed dark and thick, so you notice it?' },
];
export const FEATURE_USE: readonly { feature: string; ask: string }[] = [
  { feature: 'glossary', ask: 'You want to know what tadpole means. Where do you look?' },
  { feature: 'table of contents', ask: 'You want the page about what frogs eat. Where do you look first?' },
  { feature: 'caption', ask: 'You want to know what a photo of a frog shows. Where do you look?' },
  { feature: 'label', ask: 'You want to know which part of the frog is its webbed foot. Where do you look?' },
  { feature: 'title', ask: 'You want to know the name of the book. Where do you look?' },
  { feature: 'heading', ask: 'You want to find the part of the page about frog eggs. What do you look for?' },
];

// ---- Grade 2 D.8 Poems ----
// Four lines. Lines one and four are the same. Lines two and three end with words that rhyme.
// `others` are words from the poem that do not rhyme with the pair.
export const POEMS: readonly { id: string; lines: readonly [string, string, string, string]; rhyme: readonly [string, string]; others: readonly [string, string] }[] = [
  { id: 'po1', lines: ['Little frog, little frog,', 'you sit on a log,', 'you hide in the fog,', 'little frog, little frog.'], rhyme: ['log', 'fog'], others: ['sit', 'hide'] },
  { id: 'po2', lines: ['Rain, rain, all day,', 'the clouds are gray,', 'I cannot play,', 'rain, rain, all day.'], rhyme: ['gray', 'play'], others: ['clouds', 'cannot'] },
  { id: 'po3', lines: ['Bake a cake, bake a cake,', 'what fun we make,', 'a treat to take,', 'bake a cake, bake a cake.'], rhyme: ['make', 'take'], others: ['fun', 'treat'] },
  { id: 'po4', lines: ['Up in the sky,', 'the birds fly high,', 'they wave goodbye,', 'up in the sky.'], rhyme: ['high', 'goodbye'], others: ['birds', 'wave'] },
  { id: 'po5', lines: ['Snow is falling down,', 'it covers all the town,', 'the hills are white, not brown,', 'snow is falling down.'], rhyme: ['town', 'brown'], others: ['covers', 'hills'] },
  { id: 'po6', lines: ['My cat likes to nap,', 'curled up on my lap,', 'she wakes at a clap,', 'my cat likes to nap.'], rhyme: ['lap', 'clap'], others: ['curled', 'wakes'] },
  { id: 'po7', lines: ['Sun on the sea,', 'a swim just for me,', 'as warm as can be,', 'sun on the sea.'], rhyme: ['me', 'be'], others: ['swim', 'warm'] },
  { id: 'po8', lines: ['Ring goes the bell,', 'the school day went well,', 'I have news to tell,', 'ring goes the bell.'], rhyme: ['well', 'tell'], others: ['school', 'news'] },
];

// ---- Grade 2 D.9 Compare two stories ----
export const STORY_PAIRS: readonly { id: string; one: string; two: string; same: readonly [string, string, string]; differ: readonly [string, string, string] }[] = [
  { id: 'sp1', one: 'Ana lost her cat. She looked in the yard and found it in a tree.', two: 'Ben lost his dog. He looked in the park and found it by the pond.', same: ['A pet is lost and found.', 'A pet climbs a tree.', 'A child goes to school.'], differ: ['One pet is a cat, the other is a dog.', 'One child is happy, the other is sad.', 'One story is at school.'] },
  { id: 'sp2', one: 'A fox wanted grapes. They were too high, so the fox gave up.', two: 'A bear wanted honey. It was too high, so the bear climbed up and got it.', same: ['An animal wants food that is up high.', 'An animal goes to sleep.', 'Two animals are friends.'], differ: ['The fox gives up, but the bear gets the food.', 'The fox gets the food, but the bear gives up.', 'Both animals give up.'] },
  { id: 'sp3', one: 'Sam made a card for his mom. She smiled and hugged him.', two: 'Kim made a card for her dad. He smiled and put it on the wall.', same: ['A child makes a card for a parent.', 'A child bakes a cake.', 'A parent is angry.'], differ: ['Sam’s mom hugs him, but Kim’s dad puts the card on the wall.', 'Sam’s card is for his dad.', 'Kim does not make a card.'] },
  { id: 'sp4', one: 'It rained, so Max played a game inside.', two: 'It snowed, so Lin built a snowman outside.', same: ['The weather changes what a child does.', 'Both children go to the beach.', 'Both children are sick.'], differ: ['Max plays inside, but Lin plays outside.', 'Max plays outside, but Lin plays inside.', 'Both play inside.'] },
  { id: 'sp5', one: 'A little hen planted wheat. No one helped, so she ate the bread alone.', two: 'A little duck planted corn. Her friends helped, so they all ate together.', same: ['A bird plants a crop to eat.', 'A bird flies away.', 'A bird is lost.'], differ: ['The hen eats alone, but the duck eats with friends.', 'The hen eats with friends, but the duck eats alone.', 'Neither bird eats.'] },
  { id: 'sp6', one: 'Jo was scared of the dark. Her dad gave her a night light.', two: 'Tess was scared of the dark. Her sister sang her a song.', same: ['A girl is scared of the dark.', 'A girl is scared of dogs.', 'A girl goes camping.'], differ: ['Jo gets a night light, but Tess hears a song.', 'Jo hears a song, but Tess gets a night light.', 'Both get a night light.'] },
  { id: 'sp7', one: 'A turtle and a rabbit had a race. The rabbit took a nap, and the turtle won.', two: 'A snail and a cat had a race. The cat stopped to play, and the snail won.', same: ['A slow animal wins a race.', 'A fast animal wins a race.', 'No one finishes the race.'], differ: ['One race has a turtle, the other has a snail.', 'One race is won by a rabbit.', 'One race has no winner.'] },
  { id: 'sp8', one: 'Lin found a shell on the beach. She gave it to her friend.', two: 'Max found a feather in the woods. He gave it to his friend.', same: ['A child finds something and gives it away.', 'A child keeps what they find.', 'A child loses a toy.'], differ: ['Lin is at the beach, but Max is in the woods.', 'Lin is in the woods, but Max is at the beach.', 'Both are at the beach.'] },
];

// ---- Grade 2 D.10 Author's purpose ----
export const PURPOSES: readonly string[] = ['To tell a story', 'To teach facts', 'To get you to do something', 'To tell how to do something'];
export const PURPOSE_TEXTS: readonly { id: string; text: string; purpose: string }[] = [
  { id: 'pu1', text: 'Mia found a lost puppy. She gave it food and named it Spot. Now Spot follows her everywhere.', purpose: 'To tell a story' },
  { id: 'pu2', text: 'One day a mouse woke a lion. The lion let the mouse go. Later the mouse saved the lion.', purpose: 'To tell a story' },
  { id: 'pu3', text: 'Max wanted to fly. He built wings from boxes. He did not fly, but he had fun.', purpose: 'To tell a story' },
  { id: 'pu4', text: 'Ants live in big groups. They dig tunnels under the ground. Ants can carry heavy things.', purpose: 'To teach facts' },
  { id: 'pu5', text: 'The moon goes around the earth. It has no light of its own. It shines with light from the sun.', purpose: 'To teach facts' },
  { id: 'pu6', text: 'Penguins are birds, but they cannot fly. They swim very well. They live where it is cold.', purpose: 'To teach facts' },
  { id: 'pu7', text: 'Come to the school fair on Saturday! There will be games and snacks. You will love it!', purpose: 'To get you to do something' },
  { id: 'pu8', text: 'Please keep the park clean. Put your trash in the bin. Help keep it nice for all of us!', purpose: 'To get you to do something' },
  { id: 'pu9', text: 'Read a book every night! Books take you to new places. Pick one and start today!', purpose: 'To get you to do something' },
  { id: 'pu10', text: 'First, get two slices of bread. Next, spread jam on one slice. Last, put the slices together.', purpose: 'To tell how to do something' },
  { id: 'pu11', text: 'First, wet your hands. Next, rub on soap. Last, rinse and dry your hands.', purpose: 'To tell how to do something' },
  { id: 'pu12', text: 'First, fill a pot with dirt. Then, push a seed in. Last, give it water every day.', purpose: 'To tell how to do something' },
];
