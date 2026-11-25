import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './site/router';
import Nav from './site/ui/Nav';
import Footer from './site/ui/Footer';
import Home from './site/pages/Home';
import Category from './site/pages/Category';
import Credits from './site/pages/Credits';
import Platforms from './site/pages/Platforms';
import About from './site/pages/About';
import Contact from './site/pages/Contact';
import { SmoothScroll, useLenis } from './site/ui/motion';
import './site/site.css';
import './site/premium.css';
import './site/theme.css';
import './site/corporate.css';
import './site/theme';

const Vehicle = lazy(() => import('./site/pages/Vehicle'));
const StoryApp = lazy(() => import('./StoryApp'));

function ScrollTop({ k }) {
  const lenis = useLenis();
  useEffect(() => { window.scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true }); }, [k, lenis]);
  return null;
}

export default function App() {
  const [page, arg] = useRoute();
  const story = page === 'story';
  useEffect(() => { document.body.classList.toggle('site', !story); }, [story]);

  if (story) return <Suspense fallback={null}><StoryApp /></Suspense>;
  return (
    <SmoothScroll>
      <ScrollTop k={page + arg} />
      <Nav page={page} arg={arg} />
      <main key={page + arg}>
        {page === 'fleet' ? <Category id={arg} />
          : page === 'vehicle' ? <Suspense fallback={<div className="pageload">Assembling the twin</div>}><Vehicle look={arg} /></Suspense>
          : page === 'credits' ? <Credits />
          : page === 'platforms' ? <Platforms />
          : page === 'about' ? <About />
          : page === 'contact' ? <Contact />
          : <Home />}
      </main>
      {page !== 'vehicle' && <Footer />}
    </SmoothScroll>
  );
}
