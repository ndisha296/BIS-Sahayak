import React, { useState } from 'react';
import { Award, Camera, KeyRound, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Upload, FileCheck, HelpCircle, ArrowRight, MessageSquare, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { verifyHallmarkByCode, verifyHallmarkByImage, extractErrorMessage } from '../api/client';

export default function Verify() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'image'
  const [huidCode, setHuidCode] = useState('');
  const [claimedPurity, setClaimedPurity] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationData, setVerificationData] = useState(null);

  const purityOptions = [
    { label: t('claimed_purity_opt_default'), value: '' },
    { label: '22K916 (91.6% Pure Gold / 22 कैरट शुद्ध सोना)', value: '916' },
    { label: '18K750 (75.0% Pure Gold / 18 कैरट शुद्ध सोना)', value: '750' },
    { label: '14K585 (58.5% Pure Gold / 14 कैरट शुद्ध सोना)', value: '585' },
    { label: '24K999 (99.9% Fine Gold / 24 कैरट शुद्ध सोना)', value: '999' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!huidCode || huidCode.length !== 6) {
      setError(i18n.language === 'hi' ? 'कृपया 6-अंकीय अक्षरांकीय HUID कोड दर्ज करें।' : 'Please enter a valid 6-character alphanumeric HUID code.');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationData(null);

    try {
      const data = await verifyHallmarkByCode(huidCode, claimedPurity || null);
      setVerificationData(data);
      if (data?.verification?.verified) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyImage = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError(i18n.language === 'hi' ? 'कृपया पहले हॉलमार्क स्टैम्प की फोटो चुनें।' : 'Please select or capture a hallmark stamp image first.');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationData(null);

    try {
      const data = await verifyHallmarkByImage(selectedFile, claimedPurity || null);
      setVerificationData(data);
      if (data?.verification?.verified) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const triggerGrievanceChat = () => {
    const code = verificationData?.detected_code || huidCode || 'Unknown';
    const message = i18n.language === 'hi'
      ? `मैं HUID कोड "${code}" वाले सोने के आभूषण के संबंध में शिकायत दर्ज करना चाहता हूँ। सत्यापन विफल रहा या शुद्धता मेल नहीं खा रही है। मानकऑनलाइन पर औपचारिक शिकायत कैसे दर्ज करें?`
      : `I want to report an issue/grievance regarding a gold article hallmark with HUID: "${code}". The verification failed or purity did not match. How do I lodge a formal BIS complaint on Manakonline?`;
    window.dispatchEvent(new CustomEvent('bis-trigger-chat', { detail: { query: message } }));
  };

  const loadDemoCode = (code, purity = '916') => {
    setHuidCode(code);
    setClaimedPurity(purity);
    setError(null);
  };

  const isVerified = verificationData?.verification?.verified;
  const isPurityMatch = verificationData?.verification?.purity_match;

  return (
    <div style={{ padding: '2.5rem 0' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef8ee', color: '#92400e', padding: '0.25rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', border: '1px solid #fed7aa' }}>
            <Award size={16} /> {t('verify_page_badge')}
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{t('verify_title')}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem', lineHeight: 1.6 }}>
            {t('verify_subtitle')}
          </p>
        </div>

        {/* Input Card */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          {/* Tab Selector */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
            <div className="tab-group">
              <button
                onClick={() => { setActiveTab('code'); setError(null); }}
                className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
              >
                <KeyRound size={18} />
                <span>{t('tab_enter_code')}</span>
              </button>
              <button
                onClick={() => { setActiveTab('image'); setError(null); }}
                className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
              >
                <Camera size={18} />
                <span>{t('tab_upload_photo')}</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Tab 1: Code Verification Form */}
            {activeTab === 'code' && (
              <form onSubmit={handleVerifyCode}>
                <div className="form-group">
                  <label className="form-label">
                    {t('huid_input_label')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. AZ4567"
                    value={huidCode}
                    onChange={(e) => setHuidCode(e.target.value.toUpperCase())}
                    className="form-input uppercase"
                    style={{ fontSize: '1.25rem', padding: '0.85rem 1rem' }}
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span className="form-help">{t('huid_input_help')}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('try_demo')}</span>
                      <button type="button" onClick={() => loadDemoCode('AZ4567', '916')} style={{ color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        AZ4567 (22K)
                      </button>
                      <button type="button" onClick={() => loadDemoCode('KH9821', '750')} style={{ color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        KH9821 (18K)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('claimed_purity_label')}
                  </label>
                  <select
                    value={claimedPurity}
                    onChange={(e) => setClaimedPurity(e.target.value)}
                    className="form-select"
                  >
                    {purityOptions.map((opt, i) => (
                      <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="form-help">
                    {t('claimed_purity_help')}
                  </span>
                </div>

                <button type="submit" disabled={loading} className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {loading ? <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Award size={20} />}
                  <span>{loading ? t('btn_verifying_code') : t('btn_verify_code')}</span>
                </button>
              </form>
            )}

            {/* Tab 2: Image Verification Form */}
            {activeTab === 'image' && (
              <form onSubmit={handleVerifyImage}>
                <div className="form-group">
                  <label className="form-label">
                    {t('upload_photo_label')}
                  </label>
                  <div
                    style={{
                      border: '2px dashed var(--border-strong)',
                      borderRadius: '12px',
                      padding: '2rem',
                      textAlign: 'center',
                      background: '#f8faf9',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => document.getElementById('hallmark-file-input').click()}
                  >
                    <input
                      id="hallmark-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    {previewUrl ? (
                      <div>
                        <img
                          src={previewUrl}
                          alt="Hallmark Preview"
                          style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', margin: '0 auto 1rem' }}
                        />
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sage)' }}>
                          Click to select a different photo
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ width: '56px', height: '56px', background: 'var(--sage-light)', color: 'var(--sage-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                          <Camera size={28} />
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                          {t('upload_box_title')}
                        </h4>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                          {t('upload_box_desc')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('claimed_purity_label')}
                  </label>
                  <select
                    value={claimedPurity}
                    onChange={(e) => setClaimedPurity(e.target.value)}
                    className="form-select"
                  >
                    {purityOptions.map((opt, i) => (
                      <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={loading || !selectedFile} className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {loading ? <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={20} />}
                  <span>{loading ? t('btn_scanning') : t('btn_scan_verify')}</span>
                </button>
              </form>
            )}

            {/* Error Message */}
            {error && (
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Result Card */}
        {verificationData && (
          <div className="card" style={{ borderTop: `5px solid ${isVerified ? 'var(--success)' : 'var(--danger)'}`, animation: 'fadeIn 0.3s ease' }}>
            <div className="card-body" style={{ padding: '2rem' }}>
              {isVerified ? (
                <div>
                  {/* Verified Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.6rem', borderRadius: '50%', border: '1px solid var(--success-border)' }}>
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-text)' }}>
                            {t('authentic_hallmark_verified')}
                          </h3>
                          <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '9999px' }}>
                            {t('genuine_badge')}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {t('verified_sub')}
                        </p>
                      </div>
                    </div>

                    <div className="huid-badge">
                      <span>HUID:</span>
                      <span>{verificationData.detected_code || verificationData.verification.huid}</span>
                    </div>
                  </div>

                  {/* 4 Pillars of Hallmark Grid */}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {t('authentic_registry_params')}
                  </h4>
                  <div className="hallmark-symbols">
                    <div className="hallmark-symbol-box">
                      <div className="hallmark-symbol-title">{t('param_purity')}</div>
                      <div className="hallmark-symbol-val" style={{ color: '#d97706' }}>
                        {verificationData.verification.purity}
                      </div>
                    </div>
                    <div className="hallmark-symbol-box">
                      <div className="hallmark-symbol-title">{t('param_article_type')}</div>
                      <div className="hallmark-symbol-val">
                        {verificationData.verification.article_type || 'Jewellery'}
                      </div>
                    </div>
                    <div className="hallmark-symbol-box">
                      <div className="hallmark-symbol-title">{t('param_ahc')}</div>
                      <div className="hallmark-symbol-val">
                        {verificationData.verification.hallmarking_centre}
                      </div>
                    </div>
                    <div className="hallmark-symbol-box">
                      <div className="hallmark-symbol-title">{t('param_date')}</div>
                      <div className="hallmark-symbol-val">
                        {verificationData.verification.hallmark_date}
                      </div>
                    </div>
                  </div>

                  {/* Jeweller Details */}
                  <div style={{ background: '#f8faf9', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('registered_jeweller')}</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                        {verificationData.verification.jeweller_name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#eef4fc', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      <FileCheck size={16} /> {t('certified_jeweller_badge')}
                    </div>
                  </div>

                  {/* Purity Comparison Warning if entered */}
                  {claimedPurity && (
                    <div style={{ padding: '0.85rem 1.1rem', borderRadius: '8px', marginBottom: '1rem', background: isPurityMatch ? 'var(--success-bg)' : 'var(--warning-bg)', border: `1px solid ${isPurityMatch ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: isPurityMatch ? 'var(--success-text)' : 'var(--warning-text)' }}>
                        {isPurityMatch ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        <span>
                          {isPurityMatch 
                            ? (i18n.language === 'hi' ? 'दावा की गई शुद्धता आधिकारिक रजिस्ट्री से मेल खाती है' : 'Invoice Claim Matches Hallmark Registry Purity') 
                            : (i18n.language === 'hi' ? 'सावधानी: बिल की शुद्धता रजिस्ट्री ग्रेड से भिन्न है' : 'Caution: Invoice purity differs from certified registry')}
                        </span>
                      </div>
                      {!isPurityMatch && (
                        <p style={{ fontSize: '0.825rem', color: '#92400e', marginTop: '0.35rem' }}>
                          {verificationData.verification.message || 'Please verify the purity stamped on your retail invoice against the registry grade.'}
                        </p>
                      )}
                    </div>
                  )}

                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {verificationData.verification.photo_purity_notice}
                  </p>
                </div>
              ) : (
                /* Unverified / Alert View */
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '50%', border: '1px solid var(--danger-border)' }}>
                      <ShieldAlert size={36} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger-text)', marginBottom: '0.25rem' }}>
                        {t('hallmark_not_found')}
                      </h3>
                      <p style={{ color: '#991b1b', fontSize: '0.925rem' }}>
                        {verificationData.verification.message || 'The entered HUID could not be verified in the BIS database.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h5 style={{ fontWeight: 800, color: '#9f1239', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {t('recommended_action_consumer')}
                    </h5>
                    <ul style={{ fontSize: '0.85rem', color: '#881337', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
                      <li>{i18n.language === 'hi' ? 'आभूषण पर 6-अंकीय लेजर कोड को आवर्धक लेंस (Loupe) से दोबारा जांचें।' : 'Double check the 6-character laser mark with a magnifying glass or jeweller loupe.'}</li>
                      <li>{i18n.language === 'hi' ? 'आधिकारिक BIS Care मोबाइल ऐप का उपयोग करके क्रॉस-वेरिफाई करें।' : 'Cross-verify using the official BIS Care mobile app.'}</li>
                      <li>{i18n.language === 'hi' ? 'दुकानदार से वैध HUID युक्त अधिकृत बिल की मांग करें।' : 'If purchased recently from a retailer, demand an authentic bill with registered HUID.'}</li>
                      <li>{i18n.language === 'hi' ? 'आपको बीआईएस अधिनियम 2016 की धारा 29 के तहत उपभोक्ता शिकायत दर्ज करने का कानूनी अधिकार है।' : 'You have the legal right to submit a consumer complaint under Section 29 of the BIS Act 2016.'}</li>
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button onClick={triggerGrievanceChat} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MessageSquare size={16} />
                      <span>{t('btn_submit_grievance_ai')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
