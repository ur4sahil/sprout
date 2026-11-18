import { Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { useMusic } from '../../audio/useMusic';
import { EPISODES } from '../../stories/episodes';
import StoryBook from '../../stories/StoryBook';

// /stories: the story book. Every story the child has finished, to read again any time; the rest are closed covers.
export default function Stories() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  useMusic(null);
  if (!child) return <Navigate to="/" replace />;
  return (
    <StoryBook
      episodes={EPISODES}
      finishedIds={child.storiesRead.map((each) => each.episodeId)}
      rate={child.settings.speechRate}
      calm={child.settings.calm}
      onClose={() => void navigate('/home', { replace: true })}
    />
  );
}
