import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Award, Building2, LogIn, LogOut, CheckCircle2, AlertCircle, Menu, X, Calculator, Globe, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { checkHealth } from '../api/client';

export default function Navbar() {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [serverOnline, setServerOnline] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = i18n.language || 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('bis_language', nextLang);
  };

  useEffect(() => {
    const pingServer = async () => {
      try {
        await checkHealth();
        setServerOnline(true);
      } catch {
        setServerOnline(false);
      }
    };
    pingServer();
    const interval = setInterval(pingServer, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-badge">
            <Shield size={24} />
          </div>
          <div className="brand-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1>{t('brand_title')}</h1>
              <span style={{ fontSize: '0.675rem', background: 'var(--sage-light)', color: 'var(--sage-dark)', border: '1px solid var(--sage-border)', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                मानक सहायक
              </span>
            </div>
            <p>{t('brand_sub')}</p>
          </div>
        </Link>

        {/* Server & Language Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Bilingual Switcher Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: currentLang === 'hi' ? 'var(--sage-light)' : '#ffffff', borderColor: currentLang === 'hi' ? 'var(--sage-border)' : 'var(--border-strong)', color: currentLang === 'hi' ? 'var(--sage-dark)' : 'var(--text-main)', fontWeight: 700, fontSize: '0.8rem' }}
            title="Toggle Language / भाषा बदलें (English / हिन्दी)"
          >
            <Globe size={14} color={currentLang === 'hi' ? 'var(--sage)' : 'var(--primary)'} />
            <span>{currentLang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
          </button>

          {/* Server / Cloud Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', background: serverOnline ? '#eff8f2' : '#fef2f2', border: `1px solid ${serverOnline ? '#a7dfb8' : '#fecaca'}`, padding: '0.22rem 0.65rem', borderRadius: '9999px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: serverOnline ? '#2d7a46' : (serverOnline === false ? '#b91c1c' : '#8a9992'), display: 'inline-block' }} />
            <span style={{ color: serverOnline ? '#1b522d' : '#7f1d1d', fontWeight: 600 }}>
              {serverOnline ? t('api_online') : (serverOnline === false ? t('api_offline') : t('api_checking'))}
            </span>
          </div>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Navigation Links */}
        <nav>
          <ul className="nav-links">
            <li>
              <Link to="/assistant" className={`nav-link ${location.pathname === '/assistant' || location.pathname === '/ai-assistant' ? 'active' : ''}`}>
                <Sparkles size={17} color="var(--sage)" />
                <span>{t('nav_assistant')}</span>
                <span className="nav-persona-badge badge-consumer" style={{ background: 'rgba(74, 124, 89, 0.15)', color: 'var(--sage-dark)', border: '1px solid rgba(74, 124, 89, 0.3)' }}>{t('nav_ai_badge')}</span>
              </Link>
            </li>
            <li>
              <Link to="/verify" className={`nav-link ${location.pathname === '/verify' ? 'active' : ''}`}>
                <Award size={17} />
                <span>{t('nav_hallmark')}</span>
                <span className="nav-persona-badge badge-consumer">{t('nav_consumer_badge')}</span>
              </Link>
            </li>
            <li>
              <Link to="/standards" className={`nav-link ${location.pathname === '/standards' ? 'active' : ''}`}>
                <Shield size={17} />
                <span>{t('nav_standards')}</span>
              </Link>
            </li>
            <li>
              <Link to="/quotation" className={`nav-link ${location.pathname === '/quotation' ? 'active' : ''}`}>
                <Calculator size={17} />
                <span>{t('nav_quotation')}</span>
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className={`nav-link ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}>
                <Building2 size={17} />
                <span>{t('nav_industry')}</span>
                <span className="nav-persona-badge badge-industry">{t('nav_startup_badge')}</span>
              </Link>
            </li>

            <li style={{ marginLeft: '0.4rem' }}>
              {isAuthenticated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--sage-light)', border: '1.5px solid var(--sage-border)', color: 'var(--sage-dark)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getUserInitials(user?.name)}
                    </div>
                    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.business?.company_name || 'Enterprise'}</div>
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary btn-sm" title={t('nav_logout')}>
                    <LogOut size={15} />
                    <span>{t('nav_logout')}</span>
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-sage btn-sm">
                  <LogIn size={15} />
                  <span>{t('nav_login')}</span>
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{ background: '#ffffff', borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'center' }}
          >
            <Globe size={15} />
            <span>Language: {currentLang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
          </button>
          <Link to="/assistant" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Sparkles size={18} color="var(--sage)" />
            <span>{t('nav_assistant')}</span>
          </Link>
          <Link to="/verify" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Award size={18} />
            <span>{t('nav_hallmark')}</span>
          </Link>
          <Link to="/standards" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Shield size={18} />
            <span>{t('nav_standards')}</span>
          </Link>
          <Link to="/quotation" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Calculator size={18} />
            <span>{t('nav_quotation')}</span>
          </Link>
          <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Building2 size={18} />
            <span>{t('nav_industry')}</span>
          </Link>
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            {isAuthenticated ? (
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                <LogOut size={16} /> {t('nav_logout')} ({user?.name})
              </button>
            ) : (
              <Link to="/login" className="btn btn-sage btn-sm" style={{ width: '100%' }} onClick={() => setMobileMenuOpen(false)}>
                <LogIn size={16} /> {t('nav_login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
