/* ============================================================
   Vibe — Main App (routing + screen registry)
   ============================================================ */

const SCREENS = {
  piano:     window.PianoScreen,
  flute:     window.FluteScreen,
  guitar:    window.GuitarScreen,
  violin:    window.ViolinScreen,
  tabla:     window.TablaScreen,
  dholak:    window.DholakScreen,
  sitar:     window.SitarScreen,
  harmonium: window.HarmoniumScreen,
  drums:     window.DrumsScreen,
};

function App() {
  // route: 'landing' | 'picker' | 'band' | instrument id
  const initial = (typeof location !== 'undefined' && location.hash.replace('#', '')) || 'landing';
  const [route, setRoute] = useState(initial in SCREENS || ['landing','picker','band'].includes(initial) ? initial : 'landing');
  const [mode, setMode] = useState('manual'); // manual | auto | band

  useEffect(() => {
    location.hash = route;
    const onHash = () => {
      const r = location.hash.replace('#', '') || 'landing';
      setRoute(r in SCREENS || ['landing', 'picker', 'band'].includes(r) ? r : 'landing');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [route]);

  // Resume audio on first interaction
  useEffect(() => {
    const resume = () => window.VibeAudio.resume();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, []);

  const go = (r) => setRoute(r);

  let content;
  if (route === 'landing') {
    content = <Landing onStart={() => go('picker')} />;
  } else if (route === 'picker') {
    content = (
      <Picker
        mode={mode}
        setMode={setMode}
        onPick={(id) => go(id)}
        onHome={() => go('landing')}
        onBand={() => go('band')}
      />
    );
  } else if (route === 'band') {
    content = <BandScreen onBack={() => go('picker')} />;
  } else {
    const Comp = SCREENS[route];
    if (!Comp) { go('picker'); return null; }
    content = <Comp onBack={() => go('picker')} mode={mode} />;
  }

  return (
    <>
      <Background />
      <div className="app">{content}</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
