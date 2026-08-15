import React from 'react';

export default function ServiceCard({ icon: Icon, title, description }) {
  return (
    <div className="service-card">
      <div className="service-icon-box">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <div className="service-content">
        <h3 className="service-title">{title}</h3>
        <p className="service-description">{description}</p>
      </div>
    </div>
  );
}
