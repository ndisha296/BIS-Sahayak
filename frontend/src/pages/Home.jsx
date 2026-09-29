import React from 'react';
import { Link } from 'react-router-dom';
import { Award, ShieldCheck, Sparkles, Building2, Search, ArrowRight, CheckCircle, FileText, Cpu, FlaskConical, HelpCircle, Lock, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero Section with Dual Personas */}
      <section className="hero-gradient">
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--sage-light)', color: 'var(--sage-dark)', border: '1px solid var(--sage-border)', padding: '0.35rem 1.1rem', borderRadius: '9999px', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1.5rem', boxShadow: 'var(--shadow-xs)' }}>
            <Sparkles size={16} color="var(--sage)" /> {t('hero_tag')}
          </div>
          
          <h1 className="hero-title" style={{ maxWidth: '920px', margin: '0 auto 1.35rem' }}>
            {t('hero_title_1')} <span className="sage">{t('hero_title_consumers')}</span> {t('hero_title_with_trust')} <span className="blue">{t('hero_title_enterprises')}</span> {t('hero_title_to_compliance')}
          </h1>
          
          <p className="hero-subtitle" style={{ margin: '0 auto 2.5rem' }}>
            {t('hero_subtitle')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/verify" className="btn btn-gold btn-lg">
              <Award size={20} />
              <span>{t('btn_verify_hallmark')}</span>
            </Link>
            <Link to="/standards" className="btn btn-sage btn-lg">
              <Search size={20} />
              <span>{t('btn_discover_standards')}</span>
            </Link>
            <Link to="/quotation" className="btn btn-primary btn-lg">
              <Calculator size={20} />
              <span>{t('btn_calculate_fees')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Dual Persona Showcase Cards */}
      <section style={{ padding: '4rem 0 3.5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{t('choose_portal')}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem', fontSize: '1.025rem' }}>
              {t('choose_portal_sub')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.25rem' }}>
            {/* Persona 1: Consumer & Guest Tier */}
            <div className="card card-gold-accent" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="card-body" style={{ padding: '2.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.35rem' }}>
                  <div style={{ background: '#fef8ee', color: '#b45309', padding: '0.85rem', borderRadius: '14px', border: '1px solid #fed7aa' }}>
                    <Award size={30} />
                  </div>
                  <span className="nav-persona-badge badge-consumer">{t('nav_consumer_badge')}</span>
                </div>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.65rem', color: 'var(--primary-dark)' }}>
                  {t('consumer_card_title')}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.935rem', marginBottom: '1.75rem', lineHeight: 1.65 }}>
                  {t('consumer_card_desc')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--sage)" />
                    <span>{t('consumer_f1')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--sage)" />
                    <span>{t('consumer_f2')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--sage)" />
                    <span>{t('consumer_f3')}</span>
                  </div>
                </div>

                <Link to="/verify" className="btn btn-gold" style={{ width: '100%', padding: '0.8rem' }}>
                  <span>{t('btn_launch_verifier')}</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            {/* Persona 2: Industry & Startup Portal */}
            <div className="card card-sage-accent" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="card-body" style={{ padding: '2.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.35rem' }}>
                  <div style={{ background: 'var(--sage-light)', color: 'var(--sage-dark)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--sage-border)' }}>
                    <Building2 size={30} />
                  </div>
                  <span className="nav-persona-badge badge-industry">{t('nav_startup_badge')}</span>
                </div>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.65rem', color: 'var(--primary-dark)' }}>
                  {t('industry_card_title')}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.935rem', marginBottom: '1.75rem', lineHeight: 1.65 }}>
                  {t('industry_card_desc')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--primary)" />
                    <span>{t('industry_f1')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--primary)" />
                    <span>{t('industry_f2')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} color="var(--primary)" />
                    <span>{t('industry_f3')}</span>
                  </div>
                </div>

                <Link to={isAuthenticated ? "/dashboard" : "/login"} className="btn btn-sage" style={{ width: '100%', padding: '0.8rem' }}>
                  <span>{isAuthenticated ? t('btn_open_dashboard') : t('btn_signup_startup')}</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Knowledge Pillars */}
      <section style={{ background: '#ffffff', padding: '4rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>National Conformity & Standards Architecture</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem', fontSize: '1rem' }}>
              Built strictly aligned with the Bureau of Indian Standards Act 2016 and Manakonline schemes
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.75rem' }}>
            <div style={{ padding: '1.75rem', background: '#f8faf9', borderRadius: '14px', border: '1px solid #e2e8e5', transition: 'all 0.2s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.15rem' }}>
                <ShieldCheck size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>ISI Mark Scheme</h4>
              <p style={{ fontSize: '0.885rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Product certification for domestic and foreign manufacturers with rigorous factory audits and laboratory evaluations.
              </p>
            </div>

            <div style={{ padding: '1.75rem', background: '#f8faf9', borderRadius: '14px', border: '1px solid #e2e8e5', transition: 'all 0.2s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.15rem' }}>
                <Cpu size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>CRS Scheme</h4>
              <p style={{ fontSize: '0.885rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Compulsory Registration Scheme for electronics, IT hardware, mobile devices, power banks, batteries, and lighting systems.
              </p>
            </div>

            <div style={{ padding: '1.75rem', background: '#f8faf9', borderRadius: '14px', border: '1px solid #e2e8e5', transition: 'all 0.2s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef8ee', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.15rem' }}>
                <Award size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>HUID Gold Hallmarking</h4>
              <p style={{ fontSize: '0.885rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Mandatory 6-digit laser-engraved identification ensuring authentic gold purity (916/22K, 750/18K, 585/14K).
              </p>
            </div>

            <div style={{ padding: '1.75rem', background: '#f8faf9', borderRadius: '14px', border: '1px solid #e2e8e5', transition: 'all 0.2s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--sage-light)', color: 'var(--sage-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.15rem' }}>
                <FlaskConical size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>OSL Lab Network</h4>
              <p style={{ fontSize: '0.885rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Accredited testing facilities across India with validity records, testing charges, and material capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
