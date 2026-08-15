import React, { useState } from 'react';
import { Building, Users, Lightbulb, CreditCard } from 'lucide-react';
import './Services.css';

export default function ServicesSection() {
  const servicesList = [
    {
      id: 'workspace',
      icon: Building,
      title: 'Workspace Rental',
      label: 'WORKSPACE RENTAL',
      description: 'Flexible monthly rental options for your growing business with modern amenities, high-speed connectivity, and full incubation support.',
      pos: { left: '10%', top: '65%' },
    },
    {
      id: 'talent',
      icon: Users,
      title: 'Talent Acquisition',
      label: 'TALENT ACQUISITION',
      description: 'Connect directly with MCC interns and skilled workers to assemble a high-performing team tailored to your venture.',
      pos: { left: '33%', top: '22%' },
    },
    {
      id: 'mentorship',
      icon: Lightbulb,
      title: 'Business Mentorship',
      label: 'BUSINESS MENTORSHIP',
      description: 'Expert guidance to accelerate your business growth through strategic advisory, pitch development, and executive network connections.',
      pos: { left: '67%', top: '22%' },
    },
    {
      id: 'payment',
      icon: CreditCard,
      title: 'Online Payment Portal',
      label: 'PAYMENT PORTAL',
      description: 'Convenient monthly rent payment system featuring instant digital receipts, automated reminders, and multi-gateway security.',
      pos: { left: '90%', top: '65%' },
    },
  ];

  const [activeId, setActiveId] = useState(servicesList[0].id);

  const activeService = servicesList.find((s) => s.id === activeId) || servicesList[0];
  const ActiveIcon = activeService.icon;

  return (
    <section id="services" className="services-section">
      <div className="container services-container">
        <div className="section-header">
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">Comprehensive incubation solutions designed to launch and grow your business</p>
        </div>

        {/* Desktop / Interactive Arc Layout */}
        <div className="services-arc-wrapper">
          {/* Background Grid Pattern */}
          <div className="services-grid-bg" />

          {/* Cityscape Background Graphic (Right Side) */}
          <div className="services-cityscape-bg">
            <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M220 400V120L280 80V400H220Z" fill="currentColor" fillOpacity="0.04" />
              <path d="M280 400V40L360 10V400H280Z" fill="currentColor" fillOpacity="0.06" />
              <path d="M140 400V180L200 150V400H140Z" fill="currentColor" fillOpacity="0.03" />
              <path d="M340 400V100L400 70V400H340Z" fill="currentColor" fillOpacity="0.05" />
              <line x1="280" y1="120" x2="280" y2="400" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
              <line x1="220" y1="160" x2="220" y2="400" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Curved Dashed SVG Line connecting the node path */}
          <svg className="services-arc-svg" viewBox="0 0 1000 450" preserveAspectRatio="none">
            <path
              d="M 100 320 C 300 110, 700 110, 900 320"
              fill="none"
              stroke="rgba(139, 0, 0, 0.28)"
              strokeWidth="2.5"
              strokeDasharray="6 8"
            />
          </svg>

          {/* Center Content Box (Diamond Icon + Active Title + Underline + Description) */}
          <div className="services-center-content">
            <div className="active-diamond-box" key={`diamond-${activeService.id}`}>
              <div className="diamond-inner">
                <ActiveIcon className="diamond-icon" size={28} strokeWidth={2} />
              </div>
            </div>

            <h3 className="active-service-title" key={`title-${activeService.id}`}>
              {activeService.title}
            </h3>

            <div className="active-title-underline" />

            <p className="active-service-desc" key={`desc-${activeService.id}`}>
              {activeService.description}
            </p>
          </div>

          {/* Circular Node Buttons along the arc */}
          <div className="services-nodes-container">
            {servicesList.map((service) => {
              const ServiceIcon = service.icon;
              const isActive = service.id === activeId;

              return (
                <div
                  key={service.id}
                  className={`service-node-item ${isActive ? 'active' : ''}`}
                  style={{ left: service.pos.left, top: service.pos.top }}
                  onClick={() => setActiveId(service.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveId(service.id)}
                >
                  <div className="node-button-wrapper">
                    <div className="node-button">
                      <ServiceIcon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>
                  </div>
                  <span className="node-label">{service.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile / Navigation Switcher for smaller screens */}
        <div className="services-mobile-nav">
          <div className="mobile-nodes-pills">
            {servicesList.map((service) => {
              const ServiceIcon = service.icon;
              const isActive = service.id === activeId;
              return (
                <button
                  key={service.id}
                  className={`mobile-node-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveId(service.id)}
                >
                  <ServiceIcon size={18} />
                  <span>{service.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mobile-service-card">
            <div className="active-diamond-box">
              <div className="diamond-inner">
                <ActiveIcon size={26} strokeWidth={2} />
              </div>
            </div>
            <h3 className="active-service-title">{activeService.title}</h3>
            <div className="active-title-underline" />
            <p className="active-service-desc">{activeService.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

