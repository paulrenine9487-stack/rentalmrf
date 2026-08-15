import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import AboutSection from '../components/AboutSection';
import ServicesSection from '../components/ServicesSection';
import Footer from '../components/Footer';

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const targetId = location.state.scrollTo;
      setTimeout(() => {
        if (targetId === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }, 100);
    }
  }, [location]);

  return (
    <div className="home-page">
      <Header />
      <main>
        <Hero />
        <AboutSection />
        <ServicesSection />
      </main>
      <Footer />
    </div>
  );
}
