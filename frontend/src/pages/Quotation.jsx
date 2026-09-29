import React, { useState, useEffect } from 'react';
import { Calculator, Send, CheckCircle2, ShieldCheck, Sparkles, Building2, HelpCircle, FileText, ArrowRight, DollarSign, Percent, Clock, Phone, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { calculateCost, submitQuotation, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Quotation() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [scheme, setScheme] = useState('ISI');
  const [isStandard, setIsStandard] = useState('');
  const [sampleQuantity, setSampleQuantity] = useState(1);
  const [testingScope, setTestingScope] = useState('Full Type Test');
  const [isMsme, setIsMsme] = useState(user?.business?.udyam_registered ?? true);

  // Live Cost Breakdown
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Ask Quotation Form
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');

  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  // Auto populate if user logged in
  useEffect(() => {
    if (user) {
      if (user.name && !contactName) setContactName(user.name);
      if (user.email && !email) setEmail(user.email);
      if (user.business?.company_name && !companyName) setCompanyName(user.business.company_name);
      if (user.business?.primary_product && !productName) setProductName(user.business.primary_product);
      if (user.business?.udyam_registered !== undefined) setIsMsme(user.business.udyam_registered);
    }
  }, [user]);

  // Recalculate costs whenever input parameters change
  useEffect(() => {
    let isMounted = true;
    const fetchCost = async () => {
      setLoadingCost(true);
      try {
        const data = await calculateCost({
          scheme,
          is_standard: isStandard || undefined,
          sample_quantity: parseInt(sampleQuantity) || 1,
          is_msme: Boolean(isMsme),
          testing_scope: testingScope,
        });
        if (isMounted) setCostBreakdown(data);
      } catch (err) {
        console.error('Cost calculation error:', err);
      } finally {
        if (isMounted) setLoadingCost(false);
      }
    };

    fetchCost();
    return () => { isMounted = false; };
  }, [scheme, isStandard, sampleQuantity, isMsme, testingScope]);

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setQuoteError(null);
    setSubmittingQuote(true);

    try {
      const result = await submitQuotation({
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        product_name: productName.trim(),
        scheme,
        is_standard: isStandard.trim() || undefined,
        testing_scope: testingScope,
        sample_quantity: parseInt(sampleQuantity) || 1,
        is_msme: Boolean(isMsme),
        notes: notes.trim() || undefined,
      });

      setQuoteSuccess(result);
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    } catch (err) {
      setQuoteError(extractErrorMessage(err));
    } finally {
      setSubmittingQuote(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eef4fc', color: 'var(--primary)', padding: '0.25rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', border: '1px solid #bfdbfe' }}>
            <Calculator size={15} /> {t('quotation_badge')}
          </div>
          <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.75rem' }}>
            {t('quotation_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6 }}>
            {t('quotation_subtitle')}
          </p>
        </div>

        {/* Quick Highlights Row */}
        <div className="standard-grid-3" style={{ marginBottom: '2.5rem' }}>
          <div className="stat-tile">
            <div className="stat-icon-wrap" style={{ background: 'var(--sage-light)', color: 'var(--sage-dark)' }}>
              <Percent size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('msme_discount_tile_title')}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('msme_discount_tile_val')}</div>
            </div>
          </div>

          <div className="stat-tile">
            <div className="stat-icon-wrap" style={{ background: '#eef4fc', color: '#153e75' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('tariff_tile_title')}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('tariff_tile_val')}</div>
            </div>
          </div>

          <div className="stat-tile">
            <div className="stat-icon-wrap" style={{ background: '#fef8ee', color: '#92400e' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('turnaround_tile_title')}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('turnaround_tile_val')}</div>
            </div>
          </div>
        </div>

        {quoteSuccess ? (
          <div className="card" style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem', borderTop: '4px solid var(--sage)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid var(--success-border)' }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>
              {t('quote_success_title')}
            </h2>
            <div style={{ display: 'inline-block', background: 'var(--sage-light)', border: '1.5px dashed var(--sage-border)', color: 'var(--sage-dark)', padding: '0.45rem 1.35rem', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '1.25rem', margin: '0.75rem 0 1.25rem' }}>
              {quoteSuccess.quotation_id}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              {quoteSuccess.message}
            </p>

            {quoteSuccess.breakdown && (
              <div style={{ background: '#f8faf9', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', margin: '0 auto 2rem', textAlign: 'left' }}>
                <div className="cost-row">
                  <span>Product:</span>
                  <strong>{quoteSuccess.quote.product_name}</strong>
                </div>
                <div className="cost-row">
                  <span>Scheme:</span>
                  <span>{quoteSuccess.quote.scheme}</span>
                </div>
                <div className="cost-row">
                  <span>MSME Concession:</span>
                  <strong style={{ color: 'var(--success)' }}>
                    {quoteSuccess.breakdown.msme_discount > 0 ? `- ₹${quoteSuccess.breakdown.msme_discount.toLocaleString('en-IN')}` : 'None'}
                  </strong>
                </div>
                <div className="cost-row total">
                  <span>{t('total_estimated_cost')}:</span>
                  <span style={{ color: 'var(--primary)' }}>₹{quoteSuccess.breakdown.total_estimated_cost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setQuoteSuccess(null)}
                className="btn btn-secondary"
              >
                {t('btn_create_another_quote')}
              </button>
              <a href="/dashboard" className="btn btn-sage">
                {t('btn_view_in_dashboard')}
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: '2rem', alignItems: 'flex-start' }}>
            {/* Left: Input Form */}
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('quote_step1_title')}</h3>
                </div>
                <span className="badge-blue">Step 1 of 2</span>
              </div>

              <form onSubmit={handleSubmitQuotation} className="card-body">
                {quoteError && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '8px', fontSize: '0.875rem' }}>
                    {quoteError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('scheme_label')}</label>
                    <select
                      value={scheme}
                      onChange={(e) => setScheme(e.target.value)}
                      className="form-select"
                    >
                      <option value="ISI">ISI Mark (Scheme I - Domestic)</option>
                      <option value="CRS">CRS (Scheme II - Electronics & IT)</option>
                      <option value="FMCS">FMCS (Foreign Manufacturers)</option>
                      <option value="Hallmarking">Hallmarking (Gold/Silver AHC)</option>
                      <option value="Lab Testing">BIS Recognized Lab Testing</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('is_standard_label')}</label>
                    <input
                      type="text"
                      value={isStandard}
                      onChange={(e) => setIsStandard(e.target.value)}
                      placeholder="e.g. IS 16046, IS 269, IS 1417"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('testing_scope_label')}</label>
                    <select
                      value={testingScope}
                      onChange={(e) => setTestingScope(e.target.value)}
                      className="form-select"
                    >
                      <option value="Full Type Test">Full Type Test (Mandatory for Grant)</option>
                      <option value="Safety Parameters">Safety & Electrical Parameters Only</option>
                      <option value="Performance Test">Performance & Durability Test</option>
                      <option value="Partial Check">Pre-audit Screening Test</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{t('sample_batches')}</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sampleQuantity}
                      onChange={(e) => setSampleQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* MSME Concession Option */}
                <div style={{ background: 'var(--sage-light)', border: '1px solid var(--sage-border)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="page-calc-msme"
                    checked={isMsme}
                    onChange={(e) => setIsMsme(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--sage)' }}
                  />
                  <label htmlFor="page-calc-msme" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--sage-dark)', cursor: 'pointer' }}>
                    {t('msme_concession_checkbox')}
                  </label>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary-dark)' }}>
                    {t('quote_step2_title')}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('company_name_label')}</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Apex Tech Innovations Ltd"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('contact_person_label')}</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Ananya Sen"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('official_email_label')}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. contact@apextech.in"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t('phone_label')}</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 9876543210"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('product_specs_label')}</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Smart LED Luminaire (IS 16102)"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('notes_label')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Specify test parameters or questions for the BIS desk..."
                      className="form-textarea"
                      rows={2}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="btn btn-sage btn-lg"
                    style={{ width: '100%' }}
                  >
                    <Send size={18} />
                    <span>{submittingQuote ? t('btn_submitting_quote') : t('btn_submit_quotation')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Tariff Summary Box */}
            <div>
              {costBreakdown && (
                <div className="cost-breakdown-card" style={{ position: 'sticky', top: '90px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1.5px solid var(--sage-border)', paddingBottom: '0.75rem' }}>
                    <Sparkles size={18} color="var(--sage)" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      {t('live_cost_matrix')}
                    </h3>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {t('standard_breakdown_for')} <strong>{costBreakdown.scheme_name}</strong>
                  </div>

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>{t('app_fee')}</span>
                    <strong>₹{costBreakdown.application_fee.toLocaleString('en-IN')}</strong>
                  </div>

                  {costBreakdown.audit_fee > 0 && (
                    <div className="cost-row">
                      <span style={{ color: 'var(--text-muted)' }}>{t('audit_fee')}</span>
                      <strong>₹{costBreakdown.audit_fee.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>
                      {t('lab_fee')} ({sampleQuantity}):
                    </span>
                    <strong>₹{costBreakdown.testing_fee.toLocaleString('en-IN')}</strong>
                  </div>

                  {costBreakdown.annual_marking_fee > 0 && (
                    <div className="cost-row">
                      <span style={{ color: 'var(--text-muted)' }}>{t('annual_fee')}</span>
                      <strong>₹{costBreakdown.annual_marking_fee.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  {costBreakdown.msme_discount > 0 && (
                    <div className="cost-row" style={{ color: 'var(--success-text)', background: 'var(--success-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 700 }}>{t('msme_discount')}</span>
                      <strong>- ₹{costBreakdown.msme_discount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>{t('gst_label')}</span>
                    <span>₹{costBreakdown.gst_18_pct.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="cost-row total">
                    <div>
                      <div>{t('total_estimated_cost')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {t('all_inclusive_inr')}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                      ₹{costBreakdown.total_estimated_cost.toLocaleString('en-IN')}
                    </div>
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
