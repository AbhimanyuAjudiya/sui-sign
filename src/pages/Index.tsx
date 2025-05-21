import Header from '../components/Layout/Header';
import Hero from '../components/sections/Hero';
import Features from '../components/sections/Features';
import HowItWorks from '../components/sections/HowItWorks';
import Benefits from '../components/sections/Benefits';
// import Testimonials from '../components/sections/Testimonials';
import FAQ from '../components/sections/FAQ';
import Footer from '../components/Layout/Footer';

function Index() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Benefits />
        {/* <Testimonials /> */}
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}

export default Index;