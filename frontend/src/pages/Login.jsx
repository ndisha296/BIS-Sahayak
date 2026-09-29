import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Building2, LogIn, UserPlus, Shield, CheckCircle, AlertTriangle, ArrowRight, Lock, Mail, User, Sparkles, Key, Eye, EyeOff, ShieldCheck, Award, FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [role, setRole] = useState('industry'); // 'industry' | 'consumer'
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [primaryProduct, setPrimaryProduct] = useState('');
  const [isMsme, setIsMsme] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(null);

  const { user, isAuthenticated, loginUser, registerUser, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect');

  useEffect(() => {
    if (isAuthenticated && !location.search.includes('reset=true')) {
      if (redirectPath) {
        navigate(redirectPath);
      } else if (user?.role === 'consumer') {
        navigate('/verify');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, redirectPath, navigate, location.search]);

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '#e2e8e5' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: i18n.language === 'hi' ? 'कमजोर' : 'Weak', color: '#b91c1c' };
    if (score === 2) return { score: 2, label: i18n.language === 'hi' ? 'साधारण' : 'Fair', color: '#b45309' };
    if (score === 3) return { score: 3, label: i18n.language === 'hi' ? 'अच्छा' : 'Good', color: '#4a7c59' };
    return { score: 4, label: i18n.language === 'hi' ? 'मजबूत और सुरक्षित' : 'Strong & Compliant', color: '#1b522d' };
  };

  const strength = getPasswordStrength(password);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await loginUser(email, password);
      // Route based on role selection
      if (redirectPath) {
        navigate(redirectPath);
      } else if (role === 'consumer') {
        navigate('/verify');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(i18n.language === 'hi' ? 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।' : 'Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await registerUser({
        name,
        email,
        password,
        companyName: role === 'industry' ? companyName : undefined,
        primaryProduct: role === 'industry' ? primaryProduct : undefined,
        isUdyam: role === 'industry' ? isMsme : false,
      });
      setSuccessMessage(i18n.language === 'hi' ? 'खाता सफलतापूर्वक बन गया! रीडायरेक्ट हो रहा है...' : 'Account created successfully! Redirecting...');
      setTimeout(() => {
        if (redirectPath) {
          navigate(redirectPath);
        } else if (role === 'consumer') {
          navigate('/verify');
        } else {
          navigate('/dashboard');
        }
      }, 1200);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsConsumer = () => {
    navigate('/verify');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotNotice(null);
    try {
      await resetPassword(forgotEmail);
      setForgotNotice({ type: 'success', msg: i18n.language === 'hi' ? 'पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है।' : 'Password reset link sent to your registered email.' });
    } catch (err) {
      setForgotNotice({ type: 'error', msg: extractErrorMessage(err) });
    } finally {
      setForgotLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail, demoPass, targetRole = 'industry') => {
    setRole(targetRole);
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div style={{ padding: '3rem 0 5rem', minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '580px' }}>
        {/* Main Gateway Card */}
        <div className="card" style={{ borderTop: `4px solid ${role === 'industry' ? 'var(--sage)' : 'var(--accent-gold)'}`, boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--radius-xl)' }}>
          {/* Header */}
          <div style={{ padding: '2rem 2rem 1.25rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, #f0f6f2 0%, #ffffff 100%)' }}>
            <div style={{ width: '56px', height: '56px', background: role === 'industry' ? 'var(--primary-gradient)' : 'var(--accent-gold-gradient)', color: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 6px 18px var(--primary-glow)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {role === 'industry' ? <Building2 size={30} /> : <Award size={30} />}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
              Bureau of Indian Standards Gateway
            </h2>
            <p style={{ fontSize: '0.865rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {i18n.language === 'hi' ? 'अपनी आवश्यकतानुसार पोर्टल चुनें और प्रमाणीकृत करें' : 'Select your portal tier to sign in and manage compliance'}
            </p>

            {/* Role / Persona Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setRole('industry'); setError(null); }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: role === 'industry' ? '2px solid var(--sage)' : '1.5px solid var(--border)',
                  background: role === 'industry' ? 'var(--sage-light)' : '#ffffff',
                  color: role === 'industry' ? 'var(--sage-dark)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Building2 size={18} color={role === 'industry' ? 'var(--sage)' : 'var(--text-light)'} />
                <span>Startup / Industry</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('consumer'); setError(null); }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: role === 'consumer' ? '2px solid var(--accent-gold)' : '1.5px solid var(--border)',
                  background: role === 'consumer' ? '#fef8ee' : '#ffffff',
                  color: role === 'consumer' ? '#92400e' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Award size={18} color={role === 'consumer' ? 'var(--accent-gold)' : 'var(--text-light)'} />
                <span>Consumer / Citizen</span>
              </button>
            </div>
          </div>

          {/* Tab Selector: Sign In vs Registration */}
          <div style={{ padding: '0.75rem 1.5rem', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
            <div className="tab-group">
              <button
                onClick={() => { setTab('login'); setError(null); setSuccessMessage(null); }}
                className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
              >
                <LogIn size={16} />
                <span>{t('tab_sign_in')}</span>
              </button>
              <button
                onClick={() => { setTab('register'); setError(null); setSuccessMessage(null); }}
                className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
              >
                <UserPlus size={16} />
                <span>{t('tab_new_reg')}</span>
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: '1.75rem 2rem' }}>
            {error && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '10px', color: 'var(--danger-text)', fontSize: '0.885rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '10px', color: 'var(--success-text)', fontSize: '0.885rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
              {tab === 'register' && (
                <>
                  <div className="form-group">
                    <label className="form-label">{role === 'industry' ? t('auth_rep_name') : 'Full Name *'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Vikramaditya Sharma"
                        style={{ paddingLeft: '2.6rem' }}
                        required
                      />
                      <User size={17} color="var(--text-light)" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  {role === 'industry' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">{t('company_unit_name')}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="form-input"
                            placeholder="e.g. Bharat Solar & Electronics Pvt Ltd"
                            style={{ paddingLeft: '2.6rem' }}
                            required
                          />
                          <Building2 size={17} color="var(--text-light)" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t('primary_prod_cat')}</label>
                        <input
                          type="text"
                          value={primaryProduct}
                          onChange={(e) => setPrimaryProduct(e.target.value)}
                          className="form-input"
                          placeholder="e.g. Lithium-ion Batteries, LED Lighting"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="form-group">
                <label className="form-label">{t('official_email')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="name@company.com"
                    style={{ paddingLeft: '2.6rem' }}
                    required
                  />
                  <Mail size={17} color="var(--text-light)" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>{t('password_label')}</label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.785rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t('forgot_pass_link')}
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••••••"
                    style={{ paddingLeft: '2.6rem', paddingRight: '2.6rem' }}
                    required
                  />
                  <Lock size={17} color="var(--text-light)" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {tab === 'register' && password && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('pass_security')}</span>
                      <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                    </div>
                    <div style={{ height: '4px', width: '100%', background: '#e2e8e5', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, transition: 'all 0.3s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              {tab === 'register' && role === 'industry' && (
                <div style={{ background: '#f0f6f2', border: '1px solid #bcd5c3', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="udyam-register-toggle"
                    checked={isMsme}
                    onChange={(e) => setIsMsme(e.target.checked)}
                    style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--sage)' }}
                  />
                  <label htmlFor="udyam-register-toggle" style={{ fontSize: '0.825rem', color: '#264e32', fontWeight: 600, cursor: 'pointer' }}>
                    {t('msme_concession_checkbox')}
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={role === 'industry' ? 'btn btn-sage' : 'btn btn-gold'}
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '1rem' }}
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : tab === 'login' ? (
                  <>
                    <LogIn size={18} />
                    <span>{role === 'industry' ? 'Sign In to Industry Dashboard' : 'Sign In to Consumer Verifier'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>{role === 'industry' ? t('btn_create_account') : 'Register Consumer Account'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Instant Consumer Direct Access Option */}
            {role === 'consumer' && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleEnterAsConsumer}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <Award size={15} color="var(--accent-gold)" />
                  <span>Instant Verification (No Sign-In Required)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Demo Quick Fill */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginBottom: '0.65rem', textAlign: 'center', fontWeight: 500 }}>
                {t('demo_creds_title')}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => fillDemoCreds('demo@manufacturing.in', 'Password123!', 'industry')}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.765rem' }}
                >
                  <Key size={13} color="var(--primary)" />
                  <span>{t('btn_demo_industry')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCreds('startup@tech.co', 'SecurePass2026!', 'industry')}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.765rem' }}
                >
                  <Sparkles size={13} color="var(--sage)" />
                  <span>{t('btn_demo_msme')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
              Reset Portal Password
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.35rem' }}>
              Enter your registered official email address to receive a Supabase secure reset link.
            </p>

            {forgotNotice && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.15rem', fontSize: '0.85rem', background: forgotNotice.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: forgotNotice.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {forgotNotice.msg}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="form-input"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={forgotLoading} className="btn btn-primary btn-sm">
                  {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
