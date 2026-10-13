import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import './Header.css';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId) => {
    closeMobileMenu();
    setActiveSection(sectionId);

    if (isLoginPage) {
      navigate('/', { state: { scrollTo: sectionId } });
      return;
    }

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Scroll spy to update active section link on scroll
  useEffect(() => {
    if (isLoginPage) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      const aboutSection = document.getElementById('about');
      const servicesSection = document.getElementById('services');

      if (servicesSection && scrollPosition >= servicesSection.offsetTop - 150) {
        setActiveSection('services');
      } else if (aboutSection && scrollPosition >= aboutSection.offsetTop - 150) {
        setActiveSection('about');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoginPage]);

  const [dynamicMenus, setDynamicMenus] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/menus/public`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menus && data.menus.length > 0) {
          setDynamicMenus(data.menus);
        }
      })
      .catch((err) => console.warn('Failed to fetch public menu items:', err));
  }, []);

  return (
    <header className="header-navbar">
      <div className="container header-container">
        {/* LEFT: Text-only Branding */}
        <div
          className="header-brand"
          onClick={() => handleNavClick('home')}
          role="button"
          tabIndex={0}
        >
          <img
            src="/mcc-crest-transparent.png"
            alt="MCC Emblem Logo"
            className="header-logo-img"
          />
          <div className="brand-text-container">
            <span className="brand-title">MCC-MRF INNOVATION PARK</span>
            <span className="brand-subtitle">Incubation Portal</span>
          </div>
        </div>

        {/* Mobile menu toggle button */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* RIGHT: Dynamic Navigation Links from Super Admin + Permanent Login Button */}
        <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {dynamicMenus && dynamicMenus.length > 0 ? (
            dynamicMenus
              .filter((item) => {
                const title = (item.title || '').toLowerCase().trim();
                const url = (item.url || '').toLowerCase().trim();
                return url !== '/login' && title !== 'login' && title !== 'contact' && !url.includes('contact');
              })
              .map((item) => (
                item.url.startsWith('/') && !item.url.includes('#') ? (
                  <Link
                    key={item.id}
                    to={item.url}
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`nav-link ${
                      activeSection === item.url.replace('/#', '').replace('#', '') ? 'active' : ''
                    }`}
                    onClick={() => handleNavClick(item.url.replace('/#', '').replace('#', ''))}
                  >
                    {item.title}
                  </button>
                )
              ))
          ) : (
            <>
              <button
                className={`nav-link ${!isLoginPage && activeSection === 'home' ? 'active' : ''}`}
                onClick={() => handleNavClick('home')}
              >
                Home
              </button>
              <button
                className={`nav-link ${!isLoginPage && activeSection === 'about' ? 'active' : ''}`}
                onClick={() => handleNavClick('about')}
              >
                About
              </button>
              <button
                className={`nav-link ${!isLoginPage && activeSection === 'services' ? 'active' : ''}`}
                onClick={() => handleNavClick('services')}
              >
                Services
              </button>
            </>
          )}

          {/* PERMANENT LOGIN BUTTON */}
          <Link
            to="/login"
            className="login-btn nav-link"
            onClick={closeMobileMenu}
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
