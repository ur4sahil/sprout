import LessonHost from '../components/LessonHost';

// Sprout, standing in the garden. This is the one place the garden asks for Sprout's picture, so when the cast
// (game feel, phase 3) is ready, only this file changes.
export default function GardenSprout({ cheering = false }: { cheering?: boolean }) {
  return <LessonHost mood={cheering ? 'cheering' : 'idle'} />;
}
