import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import './Footer.css';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5A0000">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5A0000">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.34 1.07-2.42 2.42-2.42s2.42 1.08 2.42 2.42v4.93h2.7v-.01zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5A0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5A0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#FFFFFF" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5A0000">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DiamondAccent = () => (
  <div className="diamond-accent-line">
    <span className="accent-bar" />
    <span className="accent-diamond">◆</span>
    <span className="accent-bar" />
  </div>
);

const renderSocialIcon = (platform) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('facebook')) return <FacebookIcon />;
  if (p.includes('linkedin')) return <LinkedinIcon />;
  if (p.includes('instagram')) return <InstagramIcon />;
  if (p.includes('youtube')) return <YoutubeIcon />;
  if (p.includes('twitter') || p.includes('x')) return <TwitterIcon />;
  return <Mail size={18} color="#5A0000" />;
};

export default function Footer() {
  const [footerData, setFooterData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/footer/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.footerData) {
          setFooterData(data.footerData);
        }
      })
      .catch((err) => console.warn('Failed to fetch public footer data:', err));
  }, []);

  const settings = footerData?.settings || {
    organization_name: 'MCC-MRF',
    description: 'Nurturing innovation and entrepreneurship',
    email: 'Info@mccmrfip.com',
    phone: '+91 72000 99955',
    address: 'East Tambaram, Chennai, 600059, Tamil Nadu',
    copyright_text: '© 2025 MCC-MRF Innovation Park. All rights reserved.'
  };

  const socials = footerData?.socials
    ? footerData.socials.filter((s) => s.status === 'Active')
    : [
        { id: 1, platform: 'Facebook', url: 'https://www.facebook.com/people/MCC-MRF-Innovation-PARK/100076807942949/#' },
        { id: 2, platform: 'LinkedIn', url: 'https://in.linkedin.com/company/mccmrfinnovationpark' },
        { id: 3, platform: 'Instagram', url: 'https://www.instagram.com/mccmrfinnovpark/' },
        { id: 4, platform: 'YouTube', url: 'https://www.youtube.com/@mcc-mrfinnovationpark1042' }
      ];

  return (
    <footer className="footer-section">
      {/* Background Architectural Building Sketch */}
      <div className="footer-building-sketch">
        <img src="/footer-building-bg.png" alt="MCC Building Architecture Sketch" />
      </div>

      <div className="container footer-container">
        <div className="footer-main-layout">
          {/* COLUMN 1: Logo & Dynamic Socials */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img src="/mcc-crest-maroon.png" alt="MCC Emblem" className="footer-crest-logo" />
              <div className="footer-brand-titles">
                <h3 className="footer-brand-main">MCC-MRF</h3>
                <span className="footer-brand-sub">INNOVATION PARK</span>
                <DiamondAccent />
                <p className="footer-tagline">
                  {settings.description || 'Nurturing innovation and entrepreneurship'}
                </p>
              </div>
            </div>

            {/* Dynamic Social Media Links from Super Admin */}
            <div className="footer-social-links">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  aria-label={s.platform}
                  title={s.platform}
                >
                  {renderSocialIcon(s.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Vertical Divider 1 */}
          <div className="vertical-divider">
            <span className="v-diamond">◆</span>
          </div>

          {/* COLUMN 2: Dynamic Contact Details */}
          <div className="footer-contact-col">
            <h4 className="footer-col-title">Contact</h4>
            <DiamondAccent />

            <div className="footer-contact-list">
              <div className="contact-item">
                <div className="contact-icon-box">
                  <Mail size={18} />
                </div>
                <div className="contact-text-box">
                  <span className="contact-label">Email</span>
                  <a href={`mailto:${settings.email || 'Info@mccmrfip.com'}`} className="contact-value">
                    {settings.email || 'Info@mccmrfip.com'}
                  </a>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon-box">
                  <Phone size={18} />
                </div>
                <div className="contact-text-box">
                  <span className="contact-label">Phone</span>
                  <a href={`tel:${(settings.phone || '').replace(/\s+/g, '')}`} className="contact-value">
                    {settings.phone || '+91 72000 99955'}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Divider 2 */}
          <div className="vertical-divider">
            <span className="v-diamond">◆</span>
          </div>

          {/* COLUMN 3: Dynamic Address Details */}
          <div className="footer-address-col">
            <h4 className="footer-col-title">Address</h4>
            <DiamondAccent />

            <div className="contact-item">
              <div className="contact-icon-box">
                <MapPin size={18} />
              </div>
              <div className="contact-text-box">
                <p className="contact-value address-text">
                  {settings.address || 'East Tambaram, Chennai, 600059, Tamil Nadu'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave Divider */}
      <div className="footer-wave-divider">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path d="M0,30 C300,60 900,0 1200,30 L1200,60 L0,60 Z" fill="#4A0000" />
        </svg>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom-bar">
        <div className="bottom-bar-waves" />
        <div className="container footer-bottom-container">
          <span>{settings.copyright_text || '© 2025 MCC-MRF Innovation Park. All rights reserved.'}</span>
        </div>
      </div>
    </footer>
  );
}
