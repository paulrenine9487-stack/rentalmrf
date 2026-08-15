import React from 'react';

export default function FeatureCard({ number, icon: Icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon-outer-ring">
        <span className="orbit-dot"></span>
        <div className="feature-icon-inner-circle">
          <Icon size={34} strokeWidth={1.75} color="#800000" />
        </div>
      </div>
      <h3 className="feature-title">{title}</h3>
      <div className="feature-title-divider"></div>
      <p className="feature-description">{description}</p>
      <div className="feature-number-badge">{number}</div>
    </div>
  );
}
