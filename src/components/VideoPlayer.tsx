import Icon from './Icon';
import { useEffect, useRef } from 'react';
import type { Video } from '../content/videos';
import { embedAddress, FRAME_SANDBOX, PLAYER_ORIGIN, playTime, shouldClose } from '../content/videos';
import BigButton from './BigButton';
import styles from './VideoPlayer.module.css';

interface Props {
  video: Video;
  onClose: () => void;
}

// A concept video over the whole screen (plan section 10, Video safety).
// The player is YouTube's own, with its own controls, and nothing is drawn over it. It sits in a
// sandboxed frame that cannot open a window or leave the app. The one control drawn here is Close.
// The play time is followed through the player's messages, and the video closes just before its
// end, before suggestions appear.
export default function VideoPlayer({ video, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function heard(event: MessageEvent): void {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const time = playTime(event.data);
      if (time && shouldClose(video, time)) onClose();
    }
    window.addEventListener('message', heard);
    return () => window.removeEventListener('message', heard);
  }, [video, onClose]);

  // Asks the player to report its play time. It answers with a message every few moments.
  function listen(): void {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'sprout', channel: 'widget' }), PLAYER_ORIGIN);
  }

  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label={video.title} data-video={video.youtubeId}>
      <iframe
        ref={frame}
        className={styles.frame}
        title={video.title}
        src={embedAddress(video, window.location.origin)}
        sandbox={FRAME_SANDBOX}
        allow="encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin"
        onLoad={listen}
      />
      <BigButton size="kid" onClick={onClose}>
        <Icon name="close" />Close
      </BigButton>
    </div>
  );
}
