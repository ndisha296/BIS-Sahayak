import React, { useState, useEffect } from 'react';
import { Building2, Plus, Calendar, ShieldCheck, AlertTriangle, CheckCircle, Clock, FileText, Edit3, X, Sparkles, RefreshCw, Layers, CheckCircle2, ChevronRight, HelpCircle, Calculator, Send, User, Lock, ExternalLink, ArrowRight, Bell, Globe, Tag, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getCertifications, createCertification, getQuotations, extractErrorMessage } from '../api/client';
import RenewalBanner from '../components/RenewalBanner';

export default function Dashboard() {
  const { user, supabaseUser, saveBusinessProfile } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'licenses' | 'quotations' | 'checklist'
  
  const [certifications, setCertifications] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);

  // Quotations List State
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Profile Edit State
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('Private Limited');
  const [primaryProduct, setPrimaryProduct] = useState('');
  const [udyamRegistered, setUdyamRegistered] = useState(true);
  const [udyamNumber, setUdyamNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [prefLang, setPrefLang] = useState(i18n.language || 'en');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Enter Current Certificates Form State
  const [newCertScheme, setNewCertScheme] = useState('ISI');
  const [newLicenseNo, setNewLicenseNo] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newStandard, setNewStandard] = useState('IS 16046');
  const [newIssuedDate, setNewIssuedDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [certSaving, setCertSaving] = useState(false);
  const [certSuccessNotice, setCertSuccessNotice] = useState(null);
  const [certErrorNotice, setCertErrorNotice] = useState(null);

  // Renewal Action Modal
  const [renewingCert, setRenewingCert] = useState(null);

  // Populate profile fields when user loads
  useEffect(() => {
    if (user?.business) {
      setCompanyName(user.business.company_name || '');
      setCompanyType(user.business.company_type || 'Private Limited');
      setPrimaryProduct(user.business.primary_product || '');
      setUdyamRegistered(user.business.udyam_registered ?? true);
      setUdyamNumber(user.business.udyam_number || 'UDYAM-DL-01-0045892');
      setGstNumber(user.business.gst_number || '07AAAAA0000A1Z5');
    }
  }, [user]);

  // Load certifications
  const fetchCerts = async () => {
    setLoadingCerts(true);
    try {
      const data = await getCertifications();
      setCertifications(data.certifications || []);
    } catch (err) {
      console.warn('Failed to load certs:', err);
    } finally {
      setLoadingCerts(false);
    }
  };

  // Load quotations
  const fetchQuotes = async () => {
    setLoadingQuotes(true);
    try {
      const data = await getQuotations(user?.email || null);
      setQuotations(data.quotations || []);
    } catch (err) {
      console.warn('Failed to load quotes:', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    fetchCerts();
    fetchQuotes();
  }, [user?.email]);

  // Save Business Profile
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await saveBusinessProfile({
        company_name: companyName,
        company_type: companyType,
        primary_product: primaryProduct,
        udyam_registered: udyamRegistered,
        udyam_number: udyamNumber,
        gst_number: gstNumber,
        preferred_language: prefLang,
      });

      if (prefLang !== i18n.language) {
        i18n.changeLanguage(prefLang);
        localStorage.setItem('bis_language', prefLang);
      }

      setProfileMessage({ type: 'success', text: i18n.language === 'hi' ? 'कंपनी प्रोफ़ाइल सफलतापूर्वक सहेज ली गई।' : 'Enterprise profile updated successfully.' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err) {
      setProfileMessage({ type: 'error', text: `Error: ${extractErrorMessage(err)}` });
    } finally {
      setProfileSaving(false);
    }
  };

  // Submit Current Certificate under Profile Section
  const handleAddCurrentCertificate = async (e) => {
    e.preventDefault();
    setCertErrorNotice(null);
    setCertSuccessNotice(null);

    if (!newIssuedDate || !newExpiryDate) {
      setCertErrorNotice(i18n.language === 'hi' ? 'जारी करने की तिथि और समाप्ति तिथि दोनों आवश्यक हैं।' : 'Both issue date and expiry date are required.');
      return;
    }

    setCertSaving(true);
    try {
      await createCertification({
        scheme: newCertScheme,
        license_number: newLicenseNo.trim() || undefined,
        product_category: newProdCategory.trim() || undefined,
        is_standard: newStandard.trim() || undefined,
        issued_date: newIssuedDate,
        expiry_date: newExpiryDate,
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setCertSuccessNotice(i18n.language === 'hi' ? 'लाइसेंस सफलतापूर्वक पंजीकृत और नवीनीकरण ट्रैकर से लिंक हो गया!' : 'Certificate successfully registered and linked to the automated renewal engine!');
      
      // Reset form
      setNewLicenseNo('');
      setNewProdCategory('');
      setNewIssuedDate('');
      setNewExpiryDate('');
      
      fetchCerts();
      setTimeout(() => setCertSuccessNotice(null), 5000);
    } catch (err) {
      setCertErrorNotice(extractErrorMessage(err));
    } finally {
      setCertSaving(false);
    }
  };

  const getDaysRemaining = (expiryDateStr) => {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Industry Executive Header Banner */}
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '5px solid var(--sage)', background: 'linear-gradient(135deg, #ffffff 0%, #f4f8f5 100%)' }}>
          <div className="card-body" style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '62px', height: '62px', borderRadius: '16px', background: 'var(--sage-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(74, 124, 89, 0.3)' }}>
                <Building2 size={32} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    {user?.business?.company_name || companyName || (user?.name ? user.name + ' Enterprises' : 'Bharat Tech Industries')}
                  </h1>
                  <span className="badge-sage">
                    {udyamRegistered ? 'MSME 50% Concession Verified' : 'Standard Enterprise'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.885rem', marginTop: '0.25rem' }}>
                  Authorized Representative: <strong>{user?.name || 'Verified Member'}</strong> • {user?.email}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('profile')} className="btn btn-sage btn-sm">
                <Plus size={16} />
                <span>Enter New Certificate</span>
              </button>
              <a href="/quotation" className="btn btn-secondary btn-sm">
                <Calculator size={15} />
                <span>Ask Quotation</span>
              </a>
            </div>
          </div>
        </div>

        {/* Real-time Renewal Alerts Banner */}
        <RenewalBanner certs={certifications} />

        {/* Dashboard Tab Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="tab-group" style={{ maxWidth: '720px' }}>
            <button
              onClick={() => setActiveTab('profile')}
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            >
              <User size={16} />
              <span>Enterprise Profile & Certificate Vault</span>
            </button>
            <button
              onClick={() => setActiveTab('licenses')}
              className={`tab-btn ${activeTab === 'licenses' ? 'active' : ''}`}
            >
              <ShieldCheck size={16} />
              <span>{t('tab_licenses')} ({certifications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`tab-btn ${activeTab === 'quotations' ? 'active' : ''}`}
            >
              <Calculator size={16} />
              <span>{t('tab_quotations')} ({quotations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
            >
              <FileText size={16} />
              <span>{t('tab_checklist')}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Enterprise Profile & "ENTER YOUR CURRENT CERTIFICATES" SECTION */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* 1. ENTER YOUR CURRENT CERTIFICATES SECTION */}
            <div className="card" style={{ borderTop: '4px solid var(--sage)', boxShadow: 'var(--shadow-md)' }}>
              <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ background: 'var(--sage-light)', color: 'var(--sage-dark)', padding: '0.45rem', borderRadius: '10px' }}>
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>
                      Enter Your Current Certificates & BIS Licenses
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Register your active licenses to connect with the portal and receive automated 90/30/7-day renewal countdown reminders.
                    </p>
                  </div>
                </div>
                <span className="badge-sage">Renewal Engine Sync</span>
              </div>

              <div className="card-body" style={{ padding: '2rem' }}>
                {certSuccessNotice && (
                  <div style={{ padding: '0.85rem 1.15rem', borderRadius: '10px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                    <CheckCircle size={18} />
                    <span>{certSuccessNotice}</span>
                  </div>
                )}

                {certErrorNotice && (
                  <div style={{ padding: '0.85rem 1.15rem', borderRadius: '10px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                    <AlertTriangle size={18} />
                    <span>{certErrorNotice}</span>
                  </div>
                )}

                <form onSubmit={handleAddCurrentCertificate}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Certification Scheme *</label>
                      <select
                        value={newCertScheme}
                        onChange={(e) => setNewCertScheme(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="ISI">ISI Mark (Scheme I - Domestic)</option>
                        <option value="CRS">Compulsory Registration Scheme (CRS Scheme II)</option>
                        <option value="FMCS">Foreign Manufacturers Certification Scheme (FMCS)</option>
                        <option value="Hallmarking">Hallmarking Center (AHC Scheme IV)</option>
                        <option value="Lab Testing">BIS Recognized Lab Testing</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">License / Registration Number *</label>
                      <input
                        type="text"
                        value={newLicenseNo}
                        onChange={(e) => setNewLicenseNo(e.target.value)}
                        placeholder="e.g. CM/L-7200145689 or R-41002345"
                        className="form-input uppercase"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Applicable IS Standard No.</label>
                      <input
                        type="text"
                        value={newStandard}
                        onChange={(e) => setNewStandard(e.target.value)}
                        placeholder="e.g. IS 16046 (Part 2):2018, IS 16102, IS 269"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Product Name / Description *</label>
                      <input
                        type="text"
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        placeholder="e.g. Lithium-ion Power Bank, LED Driver, Cement"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('issued')} *</label>
                      <input
                        type="date"
                        value={newIssuedDate}
                        onChange={(e) => setNewIssuedDate(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('expires')} *</label>
                      <input
                        type="date"
                        value={newExpiryDate}
                        onChange={(e) => setNewExpiryDate(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      disabled={certSaving}
                      className="btn btn-sage btn-lg"
                    >
                      <Plus size={18} />
                      <span>{certSaving ? 'Saving to Vault & Syncing...' : 'Link Certificate to Renewal Engine'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 2. ENTERPRISE PROFILE & COMPANY SETTINGS */}
            <div className="card">
              <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Company & Manufacturing Details</h3>
                </div>
                <span className="badge-blue">Supabase Profile</span>
              </div>

              <form onSubmit={handleSaveProfile} className="card-body" style={{ padding: '2rem' }}>
                {profileMessage && (
                  <div style={{ padding: '0.85rem 1.15rem', borderRadius: '10px', background: profileMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${profileMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, color: profileMessage.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} />
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Authorized Representative</label>
                    <input type="text" value={user?.name || 'Verified User'} disabled className="form-input" style={{ background: '#f1f5f3' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Registered Email</label>
                    <input type="email" value={user?.email || 'industry@enterprise.in'} disabled className="form-input" style={{ background: '#f1f5f3' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company / Manufacturing Unit *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company Structure</label>
                    <select
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                      className="form-select"
                    >
                      <option value="Private Limited">Private Limited</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="Public Limited">Public Limited</option>
                      <option value="LLP">LLP</option>
                      <option value="Individual / Startup">Individual / Startup</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Primary Product Category</label>
                    <input
                      type="text"
                      value={primaryProduct}
                      onChange={(e) => setPrimaryProduct(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Smart Electronics, LED Drivers"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      <Globe size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      {t('lang_preference')}
                    </label>
                    <select
                      value={prefLang}
                      onChange={(e) => setPrefLang(e.target.value)}
                      className="form-select"
                    >
                      <option value="en">English (Default)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: '#f0f6f2', border: '1px solid #bcd5c3', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      id="profile-msme-check"
                      checked={udyamRegistered}
                      onChange={(e) => setUdyamRegistered(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--sage)' }}
                    />
                    <label htmlFor="profile-msme-check" style={{ fontSize: '0.9rem', color: '#264e32', fontWeight: 700, cursor: 'pointer' }}>
                      Enterprise is Udyam / MSME Registered (50% Government Fee Concession)
                    </label>
                  </div>

                  {udyamRegistered && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Udyam Registration Number</label>
                        <input
                          type="text"
                          value={udyamNumber}
                          onChange={(e) => setUdyamNumber(e.target.value)}
                          className="form-input uppercase"
                          placeholder="UDYAM-XX-00-0000000"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>GSTIN (Optional)</label>
                        <input
                          type="text"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          className="form-input uppercase"
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={profileSaving} className="btn btn-sage">
                    <CheckCircle size={16} />
                    <span>{profileSaving ? 'Saving Profile...' : t('save_profile_btn')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Registered Licenses & Certifications */}
        {activeTab === 'licenses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                {t('registered_certificates')}
              </h2>
              <button onClick={() => setActiveTab('profile')} className="btn btn-outline-sage btn-sm">
                <Plus size={15} />
                <span>Enter Another Certificate</span>
              </button>
            </div>

            {loadingCerts ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                <p>Loading registered BIS licenses...</p>
              </div>
            ) : certifications.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <ShieldCheck size={48} color="var(--sage)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('no_licenses_title')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  {t('no_licenses_desc')}
                </p>
                <button onClick={() => setActiveTab('profile')} className="btn btn-sage">
                  <Plus size={16} />
                  <span>Enter Current Certificates Now</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {certifications.map((cert) => {
                  const daysLeft = getDaysRemaining(cert.expiry_date);
                  const isUrgent = daysLeft <= 30;
                  const isExpiring = daysLeft <= 90 && daysLeft > 30;

                  return (
                    <div
                      key={cert.id}
                      className="card"
                      style={{
                        borderTop: `4px solid ${isUrgent ? 'var(--danger)' : (isExpiring ? 'var(--warning)' : 'var(--sage)')}`,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div className="card-body" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', background: cert.scheme === 'ISI' ? '#eef4fc' : (cert.scheme === 'CRS' ? '#eaf3ed' : '#fef8ee'), color: cert.scheme === 'ISI' ? '#153e75' : (cert.scheme === 'CRS' ? '#264e32' : '#92400e'), border: '1px solid var(--border)' }}>
                              {cert.scheme} Scheme
                            </span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary-dark)' }}>
                              {cert.product_category || 'General Product Certificate'}
                            </h3>
                            <div style={{ fontSize: '0.825rem', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Lic No: {cert.license_number || 'CM/L-Pending'}
                            </div>
                            {cert.is_standard && (
                              <div style={{ fontSize: '0.775rem', color: 'var(--sage-dark)', fontWeight: 600, marginTop: '0.15rem' }}>
                                Standard: {cert.is_standard}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span className={isUrgent ? 'badge-red' : (isExpiring ? 'badge-amber' : 'badge-sage')}>
                              <Clock size={12} />
                              <span>{daysLeft > 0 ? `${daysLeft} ${t('days_remaining')}` : 'Expired'}</span>
                            </span>
                          </div>
                        </div>

                        <div style={{ background: '#f8faf9', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('issued')}</div>
                            <div style={{ fontWeight: 600 }}>{cert.issued_date}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('expires')}</div>
                            <div style={{ fontWeight: 700, color: isUrgent ? 'var(--danger)' : 'var(--text-main)' }}>{cert.expiry_date}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setRenewingCert(cert)}
                            className="btn btn-sage btn-sm"
                            style={{ flex: 1 }}
                          >
                            <span>{t('btn_renew_now')}</span>
                            <ArrowRight size={14} />
                          </button>
                          <a
                            href="https://www.manakonline.in"
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Open Manakonline"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Quotation Inquiries */}
        {activeTab === 'quotations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                Official Quotation Inquiries
              </h2>
              <a href="/quotation" className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Create New Quotation</span>
              </a>
            </div>

            {loadingQuotes ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                <p>Loading generated quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <Calculator size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('no_quotes_title')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  {t('no_quotes_desc')}
                </p>
                <a href="/quotation" className="btn btn-primary">
                  <span>Calculate & Ask Quotation</span>
                </a>
              </div>
            ) : (
              <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Quote Reference</th>
                      <th>Product & Standard</th>
                      <th>Scheme</th>
                      <th>Estimated Fee</th>
                      <th>MSME Concession</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--primary)' }}>
                            {q.quotation_id || `QT-${q.id}`}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{q.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.is_standard || 'Standard Applicable'}</div>
                        </td>
                        <td>
                          <span className="badge-blue">{q.scheme}</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--primary-dark)' }}>
                            ₹{q.estimated_cost ? q.estimated_cost.toLocaleString('en-IN') : 'Quote Ready'}
                          </strong>
                        </td>
                        <td>
                          {q.is_msme ? (
                            <span className="badge-sage">50% Applied</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className="badge-amber" style={{ textTransform: 'capitalize' }}>
                            {q.status || 'Submitted'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Form IX Checklist Guide */}
        {activeTab === 'checklist' && (
          <div className="card">
            <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--sage)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('form_ix_title')}</h3>
              </div>
              <span className="badge-sage">Official Checklist</span>
            </div>

            <div className="card-body" style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Under Regulation 6(4) of the BIS (Conformity Assessment) Regulations, licensees must submit Form IX at least 30 days prior to license expiration to guarantee uninterrupted mark usage.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#f8faf9', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={20} color="var(--sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>1. Production & Marking Quantity Statement</h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Audited statement of quantity produced and marked with the Standard Mark during the preceding operative year.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#f8faf9', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={20} color="var(--sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>2. Valid NABL In-House / OSL Lab Test Reports</h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Proof of routine and complete type tests conducted per the Scheme of Inspection and Testing (SIT).
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#f8faf9', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={20} color="var(--sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>3. Minimum Marking Fee & Application Payment</h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Payment receipt of annual marking fee (with 50% concession for registered Udyam MSMEs).
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#f8faf9', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={20} color="var(--sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>4. Surveillance Audit Compliance Verification</h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      No outstanding non-conformities from the previous BIS technical auditor surveillance visit.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <a href="https://www.manakonline.in" target="_blank" rel="noreferrer" className="btn btn-sage">
                  <span>Open Manakonline e-Renewal Portal</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Renew License Step Guide */}
      {renewingCert && (
        <div className="modal-overlay" onClick={() => setRenewingCert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'var(--sage-light)', color: 'var(--sage-dark)', padding: '0.4rem', borderRadius: '8px' }}>
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>License Renewal Portal Guide</h3>
              </div>
              <button onClick={() => setRenewingCert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8faf9', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-dark)' }}>{renewingCert.product_category}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>License: {renewingCert.license_number} • Scheme: {renewingCert.scheme}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, marginTop: '0.25rem' }}>Expires on: {renewingCert.expiry_date}</div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              To complete the official renewal for this certification:
            </p>

            <ol style={{ fontSize: '0.85rem', color: 'var(--text-body)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
              <li>Log in to the official <strong>Manakonline e-BIS Portal</strong>.</li>
              <li>Navigate to <strong>Conformity Assessment &gt; License Renewal &gt; Form IX</strong>.</li>
              <li>Upload your production statement and test reports.</li>
              <li>Submit payment (MSME 50% discount will be verified automatically).</li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setRenewingCert(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <a href="https://www.manakonline.in" target="_blank" rel="noreferrer" className="btn btn-sage btn-sm">
                <span>Proceed to Manakonline</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
