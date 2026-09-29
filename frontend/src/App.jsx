import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChatWidget from './components/FloatingChatWidget';
import Home from './pages/Home';
import Verify from './pages/Verify';
import Standards from './pages/Standards';
import Quotation from './pages/Quotation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Shield, ExternalLink, Award, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          
          <main className="main-content">
            <Routes>
              {/* Initial Entrance: Login / Gateway with Role Selection */}
              <Route path="/" element={<Login />} />
              <Route path="/home" element={<Home />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/standards" element={<Standards />} />
              <Route path="/quotation" element={<Quotation />} />
              <Route path="/recommend-standard" element={<Standards />} />
              <Route path="/testing-facilities" element={<Standards />} />
              <Route path="/login" element={<Login />} />
              
              {/* Authenticated Industry Portal */}
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global Floating AI Assistant Drawer */}
          <FloatingChatWidget />

          {/* Luxury Executive Footer */}
          <footer style={{ background: '#0a192f', color: '#8a9992', padding: '3.5rem 0 2rem', borderTop: '1px solid #1a3350' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'white', marginBottom: '0.85rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--sage)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={18} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>{t('brand_title')}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: '#9db2a6' }}>
                    {t('footer_tagline')}
                  </p>
                  <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#689e77', background: 'rgba(74, 124, 89, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(104, 158, 119, 0.3)' }}>
                    <CheckCircle2 size={13} /> Supabase Auth & Cloud PostgreSQL
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>{t('footer_consumer_head')}</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <li><Link to="/verify" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('tab_enter_code')}</Link></li>
                    <li><Link to="/verify" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('tab_upload_photo')}</Link></li>
                    <li><Link to="/standards" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('osl_pillar_title')}</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>{t('footer_industry_head')}</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <li><Link to="/standards" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('std_wizard_title')}</Link></li>
                    <li><Link to="/quotation" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('quotation_title')}</Link></li>
                    <li><Link to="/dashboard" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('tab_licenses')}</Link></li>
                    <li><Link to="/login" style={{ color: '#9db2a6', textDecoration: 'none' }}>{t('nav_login')}</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>{t('footer_portals_head')}</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <li><a href="https://www.bis.gov.in" target="_blank" rel="noreferrer" style={{ color: '#9db2a6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>BIS Official Portal <ExternalLink size={12} /></a></li>
                    <li><a href="https://www.manakonline.in" target="_blank" rel="noreferrer" style={{ color: '#9db2a6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>Manakonline e-BIS <ExternalLink size={12} /></a></li>
                    <li><a href="https://www.services.bis.gov.in" target="_blank" rel="noreferrer" style={{ color: '#9db2a6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>e-Sale of Standards <ExternalLink size={12} /></a></li>
                  </ul>
                </div>
              </div>

              <div style={{ paddingTop: '1.75rem', borderTop: '1px solid #162c44', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#687e74' }}>
                <div>{t('footer_rights')}</div>
                <div>{t('footer_act')}</div>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
