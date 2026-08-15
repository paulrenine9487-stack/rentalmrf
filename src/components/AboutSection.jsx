import React from 'react';
import { Building2, GraduationCap, Briefcase, Network } from 'lucide-react';
import FeatureCard from './FeatureCard';
import './About.css';

export default function AboutSection() {
  const aboutFeatures = [
    {
      id: 1,
      number: '01',
      icon: Building2,
      title: 'Modern Infrastructure',
      description: 'State-of-the-art facilities with flexible workspace solutions',
    },
    {
      id: 2,
      number: '02',
      icon: GraduationCap,
      title: 'MCC Talent Pool',
      description: 'Access to skilled interns and workers from MCC',
    },
    {
      id: 3,
      number: '03',
      icon: Briefcase,
      title: 'Business Support',
      description: 'Comprehensive mentorship and business development programs',
    },
    {
      id: 4,
      number: '04',
      icon: Network,
      title: 'Networking',
      description: 'Connect with like-minded entrepreneurs and industry experts',
    },
  ];

  return (
    <section id="about" className="about-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">About Our Incubation Program</h2>
        </div>
        <div className="about-grid">
          {aboutFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              number={feature.number}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
