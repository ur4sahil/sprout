import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { setVoiceOn } from './audio/voice';
// The typeface is bundled with the app, so it is there with no internet.
import '@fontsource-variable/nunito';
import './styles/tokens.css';
import './styles/feel.css';

// The recorded voice is used by the real app. Tests run without it.
setVoiceOn(true);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
