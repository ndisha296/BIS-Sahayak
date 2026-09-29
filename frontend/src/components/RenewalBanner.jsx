import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, FileText, IndianRupee, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCertifications } from '../api/client';

export default function RenewalBanner({ certs: propsCerts }) {
  const { t, i18n } = useTranslation();
  const [certs, setCerts] = useState(propsCerts || []);
  const [expandedChecklist, setExpandedChecklist] = useState(false);

  useEffect(() => {
    if (propsCerts && propsCerts.length > 0) {
      setCerts(propsCerts);
    } else {
      getCertifications().then((data) => {
        if (data?.certifications) setCerts(data.certifications);
      }).catch(() => {});
    }
  }, [propsCerts]);

  if (!certs || certs.length === 0) return null;

  const today = new Date();

  const urgentCerts = [];
  const warningCerts = [];
  const normalCerts = [];

  certs.forEach((cert) => {
    const daysLeft = cert.days_remaining !== undefined 
      ? cert.days_remaining 
      : Math.ceil((new Date(cert.expiry_date) - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 30) {
      urgentCerts.push({ ...cert, daysLeft });
    } else if (daysLeft <= 90) {
      warningCerts.push({ ...cert, daysLeft });
    } else {
      normalCerts.push({ ...cert, daysLeft });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
      {/* Tier 1: Urgent Action (< 30 days or Expired) */}
      {urgentCerts.length > 0 && (
        <div className="renewal-banner urgent">
          <AlertCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontWeight: 800, color: 'var(--danger-text)', fontSize: '1rem' }}>
                {i18n.language === 'hi' 
                  ? `अति आवश्यक: तत्काल लाइसेंस नवीनीकरण आवश्यक (${urgentCerts.length} लाइसेंस)` 
                  : `CRITICAL: Urgent License Renewal Required (${urgentCerts.length} License${urgentCerts.length > 1 ? 's' : ''})`}
              </h4>
              <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                {i18n.language === 'hi' ? 'निलंबन चेतावनी' : 'Imminent Suspension Warning'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#991b1b' }}>
              {i18n.language === 'hi'
                ? '30 दिनों से कम समय में समाप्त होने वाले लाइसेंसों पर विलंब शुल्क दंड लागू होता है और बीआईएस अधिनियम 2016 के तहत मानक चिह्न उपयोग अधिकार निलंबित हो सकते हैं।'
                : 'Licenses expiring in less than 30 days are subject to late fee penalties and immediate suspension of BIS mark usage rights under BIS Act 2016.'}
            </p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {urgentCerts.map((c) => (
                <div key={c.id || c.license_number} style={{ background: 'rgba(255,255,255,0.85)', padding: '0.6rem 0.9rem', borderRadius: '6px', border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#7f1d1d' }}>{c.scheme} Scheme: {c.license_number || 'CM/L-Pending'}</span>
                    <span style={{ fontSize: '0.8rem', color: '#991b1b', marginLeft: '0.75rem' }}>({c.product_category || 'General Product'})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#b91c1c' }}>
                      {c.daysLeft <= 0 ? (i18n.language === 'hi' ? 'समाप्त' : 'EXPIRED') : `${c.daysLeft} ${t('days_remaining')}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({t('expires')}: {c.expiry_date})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Renewal Needed (30 - 90 days) */}
      {warningCerts.length > 0 && (
        <div className="renewal-banner warning">
          <AlertTriangle size={24} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--warning-text)', fontSize: '1rem' }}>
                {i18n.language === 'hi' 
                  ? `आगामी लाइसेंस नवीनीकरण अवधि (30–90 दिन)` 
                  : `Upcoming License Renewal Window (30–90 Days)`}
              </h4>
              <button
                onClick={() => setExpandedChecklist(!expandedChecklist)}
                style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                {expandedChecklist ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expandedChecklist ? (i18n.language === 'hi' ? 'चेकलिस्ट छुपाएं' : 'Hide BIS Checklist') : (i18n.language === 'hi' ? 'नवीनीकरण चेकलिस्ट (फॉर्म IX) देखें' : 'View Renewal Checklist (Form IX)')}
              </button>
            </div>
            
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#92400e' }}>
              {i18n.language === 'hi'
                ? 'बीआईएस अनुशंसा करता है कि कारखाने के उत्पादन सत्यापन और परीक्षण समीक्षा के लिए समाप्ति से 60 से 90 दिन पहले नवीनीकरण प्रक्रिया शुरू करें।'
                : 'BIS recommends initiating the renewal process 60 to 90 days before expiry to allow time for factory production verification and testing review.'}
            </p>

            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {warningCerts.map((c) => (
                <div key={c.id || c.license_number} style={{ background: 'rgba(255,255,255,0.85)', padding: '0.6rem 0.9rem', borderRadius: '6px', border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#78350f' }}>{c.scheme}: {c.license_number || 'CM/L-Active'}</span>
                    <span style={{ fontSize: '0.8rem', color: '#92400e', marginLeft: '0.75rem' }}>({c.product_category || 'Industrial'})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b45309' }}>{c.daysLeft} {t('days_remaining')}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({t('expires')}: {c.expiry_date})</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist Drawer */}
            {expandedChecklist && (
              <div style={{ marginTop: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <h5 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#78350f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} /> {i18n.language === 'hi' ? 'आधिकारिक बीआईएस नवीनीकरण चेकलिस्ट:' : 'Official BIS Renewal Checklist:'}
                </h5>
                <ul style={{ fontSize: '0.825rem', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
                  <li><strong>{i18n.language === 'hi' ? 'फॉर्म IX जमा करना:' : 'Form IX Submission:'}</strong> {i18n.language === 'hi' ? 'मानकऑनलाइन पर मानकीकृत नवीनीकरण आवेदन पूरा करें।' : 'Complete the standardized renewal application on Manakonline.'}</li>
                  <li><strong>{i18n.language === 'hi' ? 'वार्षिक उत्पादन एवं अंकन डेटा:' : 'Annual Production & Marking Data:'}</strong> {i18n.language === 'hi' ? 'पिछले वित्तीय वर्ष में मानक चिह्न से चिह्नित उत्पादन का विवरण।' : 'Quantified production figures marked with Standard Mark during preceding operation period.'}</li>
                  <li><strong>{i18n.language === 'hi' ? 'परीक्षण एवं अंशांकन रिपोर्ट:' : 'Testing / Calibration Reports:'}</strong> {i18n.language === 'hi' ? 'इन-हाउस परीक्षण उपकरणों के अंशांकन रिकॉर्ड का सत्यापन।' : 'Verification of in-house testing equipment calibration records.'}</li>
                  <li><strong>{i18n.language === 'hi' ? 'शुल्क भुगतान:' : 'Fee Schedule:'}</strong> {i18n.language === 'hi' ? 'वार्षिक लाइसेंस और अंकन शुल्क का भुगतान (MSME 50% छूट लागू)।' : 'Payment of annual license fee plus marking fees (special MSME/Women startup concessions applicable).'}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tier 3: All Valid & Normal */}
      {urgentCerts.length === 0 && warningCerts.length === 0 && normalCerts.length > 0 && (
        <div className="renewal-banner normal">
          <CheckCircle size={22} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.95rem' }}>
              {i18n.language === 'hi' ? 'सभी सक्रिय लाइसेंस वैध और सुरक्षित स्थिति में हैं' : 'All Active Licenses in Good Standing'}
            </h4>
            <p style={{ fontSize: '0.825rem', color: '#166534', marginTop: '0.2rem' }}>
              {i18n.language === 'hi'
                ? `${normalCerts.length} पंजीकृत लाइसेंस अनुपालन में हैं और 90-दिवसीय नवीनीकरण सीमा से अधिक वैध हैं।`
                : `${normalCerts.length} registered certification${normalCerts.length > 1 ? 's are' : ' is'} compliant and beyond the 90-day renewal threshold.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
