import { Navigate, useNavigate } from 'react-router-dom';
import { saveStoryFinished } from '../../app/collecting';
import { useAppStore } from '../../app/store';
import { useMusic } from '../../audio/useMusic';
import { localDay } from '../../lib/clock';
import { EPISODES } from '../../stories/episodes';
import { storyForToday } from '../../stories/progress';
import StoryReader from '../../stories/StoryReader';

// /story: today's new story, offered once today's plan is done (docs/GAME_FEEL.md, phase 7). Finishing it saves it;
// leaving early saves nothing. With no story for today, home.
export default function StoryTime() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  useMusic(null);
  if (!child) return <Navigate to="/" replace />;
  // The plan was done to get here; the rule that only one new story comes a day still holds.
  const episode = storyForToday(EPISODES, child.storiesRead, true, localDay());
  if (!episode) return <Navigate to="/home" replace />;
  const home = (): void => {
    void navigate('/home', { replace: true });
  };
  return (
    <StoryReader
      episode={episode}
      rate={child.settings.speechRate}
      calm={child.settings.calm}
      onDone={() => {
        void saveStoryFinished(child, episode.id, localDay()).then(home);
      }}
      onClose={home}
    />
  );
}
