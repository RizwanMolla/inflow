import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  ArrowDown,
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Command,
  Download,
  ExternalLink,
  FolderOpen,
  Keyboard,
  Layers,
  Lock,
  Menu,
  MicOff,
  Monitor,
  Play,
  QrCode,
  ShieldCheck,
  Smartphone,
  Video,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { DOWNLOADS, RELEASES_URL, REPO_URL, VERSION } from './config';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Accent hexes are the apps' own (ACCENT_COLORS in the desktop theme).
const ACCENT = {
  indigo: '#818cf8',
  cyan: '#22d3ee',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
  violet: '#a78bfa',
  slate: '#94a3b8',
};

interface DemoKey {
  label: string;
  icon: LucideIcon;
  accent: string;
  /** What the PC reports after the key runs (shown in the toast). */
  result: string;
}

const DEMO_KEYS: DemoKey[] = [
  { label: 'Dev Mode', icon: Code2, accent: ACCENT.cyan, result: 'Opened 4 apps for Dev Mode' },
  { label: 'Mute mic', icon: MicOff, accent: ACCENT.rose, result: 'Sent Ctrl + Shift + M' },
  { label: 'Play / Pause', icon: Play, accent: ACCENT.amber, result: 'Media: Play / Pause' },
  { label: 'Job Hunt', icon: Briefcase, accent: ACCENT.emerald, result: 'Opened LinkedIn, resume & tracker' },
  { label: 'Meeting', icon: Video, accent: ACCENT.violet, result: 'Calendar open, window snapped' },
  { label: 'Volume up', icon: Volume2, accent: ACCENT.amber, result: 'Media: Volume up' },
  { label: 'Screenshot', icon: Camera, accent: ACCENT.slate, result: 'Sent Win + Shift + S' },
  { label: 'Lock PC', icon: Lock, accent: ACCENT.slate, result: 'PC locked' },
];

// Order the demo "presses" keys in; skips around so it feels like a real hand.
const PRESS_ORDER = [0, 2, 5, 1, 4, 3, 6];

const FEATURES: { icon: LucideIcon; accent: string; title: string; body: string }[] = [
  {
    icon: Layers,
    accent: ACCENT.indigo,
    title: 'Multi-action workspaces',
    body: 'One key opens your sites, folders and apps in order, waits for them, then fires a shortcut.',
  },
  {
    icon: Keyboard,
    accent: ACCENT.rose,
    title: 'Hotkeys, text & media keys',
    body: 'Send keyboard shortcuts, type saved snippets, control playback and volume, or run commands.',
  },
  {
    icon: FolderOpen,
    accent: ACCENT.amber,
    title: 'Folders, like a real deck',
    body: 'Nest pages of keys behind a folder key. The first key inside always takes you back.',
  },
  {
    icon: Activity,
    accent: ACCENT.emerald,
    title: 'Live feedback',
    body: 'Keys flash on the PC when pressed, and the phone key turns green or red with the result.',
  },
  {
    icon: ShieldCheck,
    accent: ACCENT.cyan,
    title: 'Private pairing',
    body: 'Runs on your own Wi-Fi with a per-PC pairing code. No account, no cloud, no tracking.',
  },
  {
    icon: Command,
    accent: ACCENT.violet,
    title: 'Command bar & tray',
    body: 'Press Ctrl K to launch anything, and keep the deck running from the system tray.',
  },
];

const STEPS = [
  { title: 'Design your deck', body: 'Install InFlow on Windows. Drag workspaces and built-in actions onto keys.' },
  { title: 'Pair your phone', body: 'Open the companion app and scan the QR code shown on your PC.' },
  { title: 'Tap to run', body: 'Prop the phone next to your monitor. Every tap runs instantly on your PC.' },
];

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Downloads />
      </main>
      <Footer />
    </>
  );
}

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#top" className="brand" aria-label="InFlow home">
          <img src="./logo.png" alt="" />
          InFlow
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#download">Download</a>
        </nav>
        <div className="nav-actions">
          <a href={REPO_URL} className="icon-link" target="_blank" rel="noreferrer" aria-label="InFlow on GitHub">
            <GitHubIcon />
          </a>
          <a href="#download" className="btn btn-primary btn-sm">
            <Download />
            <span className="btn-label">Download</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const scope = useRef<HTMLElement>(null);
  const toastText = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro
          .from('.badge', { y: 12, opacity: 0, duration: 0.5 })
          .from('.hero h1 .word', { y: 32, opacity: 0, duration: 0.8, stagger: 0.06 }, '-=0.25')
          .from(['.hero-sub', '.hero-ctas', '.hero-note'], { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')
          .from('.phone', { y: 48, rotateX: 14, opacity: 0, duration: 1.1, transformPerspective: 1200 }, 0.25)
          .from(
            '.deck .key',
            { scale: 0.6, opacity: 0, duration: 0.55, ease: 'back.out(1.7)', stagger: { each: 0.05, from: 'center' } },
            0.6
          );

        gsap.to('.phone', { y: -10, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 });
        gsap.to('.hero-glow', { scale: 1.12, opacity: 0.75, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });

        // The demo: a finger "presses" keys and the PC reports back in the toast.
        // immediateRender:false keeps every ring hidden until its own press comes up.
        const keys = gsap.utils.toArray<HTMLElement>('.deck .key');
        const loop = gsap.timeline({ repeat: -1, delay: 2.2 });
        PRESS_ORDER.forEach((index) => {
          const key = keys[index];
          if (!key) return;
          loop
            .to(key, { scale: 0.9, duration: 0.09, ease: 'power2.in' })
            .to(key, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' })
            .fromTo(key.querySelector('.key-ring'), { opacity: 1, scale: 0.97 }, { opacity: 0, scale: 1.06, duration: 1, ease: 'power2.out', immediateRender: false }, '<')
            .call(() => {
              if (toastText.current) toastText.current.textContent = DEMO_KEYS[index].result;
            }, [], '<')
            .fromTo('.pc-toast', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', immediateRender: false }, '<0.15')
            .to('.pc-toast', { y: -6, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=1.3')
            .to({}, { duration: 0.35 });
        });
      });
      return () => mm.revert();
    },
    { scope }
  );

  const headline = ['Your', 'phone', 'is', 'now', 'a'];

  return (
    <section className="hero" id="top" ref={scope}>
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow" aria-hidden />
      <div className="container hero-inner">
        <div>
          <span className="badge">
            <span className="badge-dot" />
            Version {VERSION} · Windows & Android
          </span>
          <h1>
            {headline.map((w) => (
              <span key={w} className="word">
                {w}&nbsp;
              </span>
            ))}
            <span className="word accent">Stream Deck.</span>
          </h1>
          <p className="hero-sub">
            InFlow launches whole workspaces, hotkeys, media controls and commands on your Windows PC with a single tap from
            your phone. Free, local, and no extra hardware.
          </p>
          <div className="hero-ctas">
            <a href={DOWNLOADS.windows.url} className="btn btn-primary" target="_blank" rel="noreferrer">
              <Monitor />
              {DOWNLOADS.windows.label}
            </a>
            <a href={DOWNLOADS.android.url} className="btn btn-secondary" target="_blank" rel="noreferrer">
              <Smartphone />
              Get the Android app
            </a>
          </div>
          <p className="hero-note">Open source on GitHub · No account required</p>
        </div>

        <div className="showcase" aria-label="InFlow companion app running a deck of keys">
          <div className="phone">
            <div className="phone-screen">
              <div className="deck">
                {DEMO_KEYS.map((k) => (
                  <div key={k.label} className="key" style={{ '--accent': k.accent } as CSSProperties}>
                    <k.icon aria-hidden />
                    <span>{k.label}</span>
                    <i className="key-ring" />
                  </div>
                ))}
              </div>
              <div className="phone-sidebar" aria-hidden>
                <span>
                  <Menu />
                </span>
                <span className="page">
                  <Layers />
                  Deck
                </span>
                <span>
                  <ChevronUp />
                </span>
                <span>
                  <ChevronDown />
                </span>
              </div>
            </div>
          </div>
          <div className="pc-toast" aria-hidden>
            <span className="tile">
              <Check />
            </span>
            <span>
              <small>On your PC</small>
              <strong ref={toastText}>{DEMO_KEYS[0].result}</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Fades sections in as they scroll into view. */
function useReveal() {
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>('.reveal');
        gsap.set(items, { opacity: 0, y: 28 });
        ScrollTrigger.batch(items, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }),
        });
      });
      return () => mm.revert();
    },
    { scope }
  );
  return scope;
}

function Features() {
  const scope = useReveal();
  return (
    <section className="section" id="features" ref={scope}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Features</span>
          <h2>Everything a Stream Deck does, on the phone you already own.</h2>
          <p>Design keys on your PC, press them anywhere in the room. Changes sync to the phone instantly.</p>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature reveal" style={{ '--accent': f.accent } as CSSProperties}>
              <div className="feature-icon">
                <f.icon aria-hidden />
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const scope = useReveal();
  return (
    <section className="section" id="how" ref={scope}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Set up in under a minute.</h2>
        </div>
        <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} className="step reveal">
              <span className="step-num">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Downloads() {
  const scope = useReveal();
  const cards = [
    {
      ...DOWNLOADS.windows,
      title: 'InFlow for Windows',
      icon: Monitor,
      points: ['Visual deck editor with drag & drop', 'Keeps running in the system tray', 'Local server, nothing leaves your network'],
    },
    {
      ...DOWNLOADS.android,
      title: 'InFlow Companion',
      icon: QrCode,
      points: ['Full-screen landscape deck', 'Crisp haptic keys with live results', 'Pairs with your PC by QR code'],
    },
  ];

  return (
    <section className="section" id="download" ref={scope}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Download</span>
          <h2>Get both apps.</h2>
          <p>Install InFlow on your PC, then the companion on your phone. Both are free.</p>
        </div>
        <div className="downloads">
          {cards.map((c) => (
            <article key={c.title} className="download-card reveal">
              <div className="download-head">
                <span className="platform-icon">
                  <c.icon aria-hidden />
                </span>
                <div>
                  <h3>{c.title}</h3>
                  <div className="meta">{c.meta}</div>
                </div>
              </div>
              <ul>
                {c.points.map((p) => (
                  <li key={p}>
                    <Check aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <a href={c.url} className="btn btn-primary" target="_blank" rel="noreferrer">
                <ArrowDown />
                {c.label}
              </a>
            </article>
          ))}
        </div>
        <a href={RELEASES_URL} className="releases-link reveal" target="_blank" rel="noreferrer">
          <GitHubIcon size={15} />
          All releases and changelogs on GitHub
          <ExternalLink />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <a href="#top" className="brand">
          <img src="./logo.png" alt="" />
          InFlow
        </a>
        <span>Built with Tauri, Rust, React and Expo · All Rights Reserved</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <GitHubIcon size={15} />
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
