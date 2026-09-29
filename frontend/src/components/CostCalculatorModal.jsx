import React, { useState, useEffect } from 'react';
import { Calculator, Send, CheckCircle2, AlertCircle, X, Sparkles, Building2, HelpCircle, FileText, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateCost, submitQuotation, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CostCalculatorModal({ isOpen, onClose, prefilledStandard = '', prefilledScheme = 'ISI', onQuotationSubmitted }) {
  const { user } = useAuth();

  const [scheme, setScheme] = useState(prefilledScheme || 'ISI');
  const [isStandard, setIsStandard] = useState(prefilledStandard || '');
  const [sampleQuantity, setSampleQuantity] = useState(1);
  const [testingScope, setTestingScope] = useState('Full Type Test');
  const [isMsme, setIsMsme] = useState(user?.business?.udyam_registered ?? true);

  // Live Cost Breakdown
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Ask Quotation Form Fields
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [companyName, setCompanyName] = useState(user?.business?.company_name || '');
  const [contactName, setContactName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState(user?.business?.primary_product || '');
  const [notes, setNotes] = useState('');

  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  // Synchronize state when props change
  useEffect(() => {
    if (prefilledStandard) setIsStandard(prefilledStandard);
    if (prefilledScheme) setScheme(prefilledScheme);
  }, [prefilledStandard, prefilledScheme]);

  // Calculate live costs whenever parameters change
  useEffect(() => {
    if (!isOpen) return;

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
  }, [scheme, isStandard, sampleQuantity, isMsme, testingScope, isOpen]);

  if (!isOpen) return null;

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
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      if (onQuotationSubmitted) onQuotationSubmitted(result);
    } catch (err) {
      setQuoteError(extractErrorMessage(err));
    } finally {
      setSubmittingQuote(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="card-header" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>BIS Fee Calculator & Ask Quotation</h3>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                Official Indian standard testing & certification cost estimator
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={22} />
          </button>
        </div>

        <div className="card-body" style={{ padding: '1.75rem' }}>
          {quoteSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Quotation Request Generated!
              </h3>
              <div style={{ display: 'inline-block', background: '#eff6ff', border: '1.5px dashed #3b82f6', color: '#1e40af', padding: '0.4rem 1rem', borderRadius: '6px', fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
                {quoteSuccess.quotation_id}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                {quoteSuccess.message} A copy of this itemized quotation has been registered under your profile for tracking.
              </p>

              {quoteSuccess.breakdown && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem', maxWidth: '480px', margin: '0 auto 1.5rem', textAlign: 'left' }}>
                  <div className="cost-row">
                    <span>Product & Standard:</span>
                    <strong>{quoteSuccess.quote.product_name} ({quoteSuccess.quote.is_standard || quoteSuccess.quote.scheme})</strong>
                  </div>
                  <div className="cost-row">
                    <span>Scheme Type:</span>
                    <span>{quoteSuccess.quote.scheme}</span>
                  </div>
                  <div className="cost-row">
                    <span>MSME 50% Concession:</span>
                    <strong style={{ color: 'var(--success)' }}>{quoteSuccess.breakdown.msme_discount > 0 ? `- ₹${quoteSuccess.breakdown.msme_discount.toLocaleString('en-IN')}` : 'Not Applied'}</strong>
                  </div>
                  <div className="cost-row total">
                    <span>Total Estimated (incl. GST):</span>
                    <span>₹{quoteSuccess.breakdown.total_estimated_cost.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={() => { setQuoteSuccess(null); setShowQuoteForm(false); }}
                  className="btn btn-secondary"
                >
                  Calculate Another Product
                </button>
                <button onClick={onClose} className="btn btn-primary">
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Top Configuration Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Certification Scheme</label>
                  <select
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    className="form-select"
                  >
                    <option value="ISI">ISI Mark (Scheme I - Domestic)</option>
                    <option value="CRS">CRS (Scheme II - Electronics / IT)</option>
                    <option value="FMCS">FMCS (Foreign Manufacturers)</option>
                    <option value="Hallmarking">Hallmarking (Gold/Silver AHC)</option>
                    <option value="Lab Testing">BIS Recognized Lab Testing Only</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Applicable IS Standard (Optional)</label>
                  <input
                    type="text"
                    value={isStandard}
                    onChange={(e) => setIsStandard(e.target.value)}
                    placeholder="e.g. IS 16046, IS 269, IS 1417"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Testing Scope</label>
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
                  <label className="form-label">Sample Batches / Quantity</label>
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

              {/* MSME Concession Checkbox */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="calc-msme"
                  checked={isMsme}
                  onChange={(e) => setIsMsme(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="calc-msme" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}>
                  Apply MSME / Startup Concession (50% Concession on Application & Minimum Marking Fee)
                </label>
              </div>

              {/* Live Cost Breakdown Card */}
              {costBreakdown && (
                <div className="cost-breakdown-card" style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1.5px solid #dbeafe', paddingBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                      {costBreakdown.scheme_name}
                    </div>
                    <span className="badge-blue">
                      {isMsme ? '50% MSME Discount Active' : 'Standard Tariff'}
                    </span>
                  </div>

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>Application & Filing Fee:</span>
                    <strong>₹{costBreakdown.application_fee.toLocaleString('en-IN')}</strong>
                  </div>

                  {costBreakdown.audit_fee > 0 && (
                    <div className="cost-row">
                      <span style={{ color: 'var(--text-muted)' }}>Factory Inspection / Audit Charges:</span>
                      <strong>₹{costBreakdown.audit_fee.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Laboratory Testing Charges ({sampleQuantity} sample batch{sampleQuantity > 1 ? 'es' : ''}):
                    </span>
                    <strong>₹{costBreakdown.testing_fee.toLocaleString('en-IN')}</strong>
                  </div>

                  {costBreakdown.annual_marking_fee > 0 && (
                    <div className="cost-row">
                      <span style={{ color: 'var(--text-muted)' }}>Minimum Annual Marking Fee (Grant):</span>
                      <strong>₹{costBreakdown.annual_marking_fee.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  {costBreakdown.msme_discount > 0 && (
                    <div className="cost-row" style={{ color: 'var(--success-text)', background: 'var(--success-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 700 }}>MSME / Udyam Concession (50%):</span>
                      <strong>- ₹{costBreakdown.msme_discount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  <div className="cost-row">
                    <span style={{ color: 'var(--text-muted)' }}>Applicable GST (18%):</span>
                    <span>₹{costBreakdown.gst_18_pct.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="cost-row total">
                    <div>
                      <div>Total Estimated Compliance Cost</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Includes application, testing, grant fee & taxes
                      </div>
                    </div>
                    <div style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>
                      ₹{costBreakdown.total_estimated_cost.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}

              {/* Ask Formal Quotation Toggle & Form */}
              {!showQuoteForm ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <button type="button" onClick={onClose} className="btn btn-secondary">
                    Close Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm(true)}
                    className="btn btn-primary"
                  >
                    <Send size={16} />
                    <span>Request Formal Quotation</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuotation} style={{ borderTop: '2px dashed var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={18} color="var(--primary)" />
                    <span>Enter Company & Product Details for Official Quote</span>
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Our certified compliance desk will review your product standard requirements and issue an official quotation with testing timeline.
                  </p>

                  {quoteError && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      {quoteError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Company / Enterprise Name *</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Apex Hardware Innovations Ltd"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Contact Person Name *</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Official Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. compliance@company.com"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Phone / WhatsApp Number</label>
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
                    <label className="form-label">Product Name & Specifications *</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. 20000mAh Power Bank (Lithium-ion)"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Additional Notes / Testing Inquiries</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Specify any special model series, testing parameters, or target launch deadline..."
                      className="form-textarea"
                      rows={2}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowQuoteForm(false)}
                      className="btn btn-secondary"
                    >
                      Back to Calculator
                    </button>
                    <button
                      type="submit"
                      disabled={submittingQuote}
                      className="btn btn-primary"
                    >
                      <Send size={16} />
                      <span>{submittingQuote ? 'Generating Quote...' : 'Submit Quotation Request'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
