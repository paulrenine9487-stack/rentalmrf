import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <section id="home" className="hero-section">
      <div className="container hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="highlight-text">MCC MRF Innovation Park</span>
          </h1>
          <p className="hero-subtitle">
            Empowering Innovation, Nurturing Growth
          </p>
          <p className="hero-description">
            Join our thriving ecosystem of innovative companies and startups. Our
            incubation center provides the perfect environment for your business
            to flourish.
          </p>
        </div>
      </div>
    </section>
  );
}
