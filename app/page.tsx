'use client';

import dynamic from 'next/dynamic';

// WebGL, WebAudio and pointer lock are browser-only, so skip server rendering.
const App = dynamic(() => import('../src/App'), { ssr: false });

export default function HomePage() {
  return <App />;
}
