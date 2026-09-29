import React, { useState } from 'react';
import { Sparkles, Search, FlaskConical, BookOpen, Building, CheckCircle, ExternalLink, ArrowRight, Layers, Tag, ShieldCheck, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { recommendStandard, getTestingFacilities, extractErrorMessage } from '../api/client';

export default function Standards() {
  const { t, i18n } = useTranslation();

  // Recommendation Wizard State
  const [productDesc, setProductDesc] = useState('');
  const [sector, setSector] = useState('electronics');
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);
  const [recResults, setRecResults] = useState(null);

  // Testing Facilities Directory State
  const [standardQuery, setStandardQuery] = useState('IS 16046');
  const [labFilter, setLabFilter] = useState('');
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState(null);
  const [labResults, setLabResults] = useState(null);

  const sampleProducts = [
    { title: i18n.language === 'hi' ? 'पावर बैंक' : 'Power Bank', sector: 'electronics', desc: i18n.language === 'hi' ? 'मोबाइल चार्जिंग के लिए लिथियम-आयन पॉलीमर बैटरी युक्त पोर्टेबल पावर बैंक' : 'Portable power bank with lithium-ion polymer battery for mobile charging' },
    { title: i18n.language === 'hi' ? 'एलईडी बल्ब 9W' : 'LED Bulb 9W', sector: 'electrical', desc: i18n.language === 'hi' ? 'घरेलू लाइटिंग के लिए 9W सेल्फ-बैलास्टेड एलईडी बल्ब' : 'Self-ballasted LED bulb 9W for domestic lighting' },
    { title: i18n.language === 'hi' ? 'मोबाइल फोन' : 'Mobile Phone', sector: 'telecom', desc: i18n.language === 'hi' ? 'वायरलेस कनेक्टिविटी और चार्जर युक्त स्मार्टफोन' : 'Smart mobile phone with wireless connectivity and charger' },
    { title: i18n.language === 'hi' ? 'गोल्ड ज्वेलरी' : 'Gold Jewellery', sector: 'jewellery', desc: i18n.language === 'hi' ? '22 कैरट सोने का हार और दुल्हन के आभूषण' : '22 Karat gold necklace and bridal jewellery' },
    { title: i18n.language === 'hi' ? 'पोर्टलैंड सीमेंट' : 'Portland Cement', sector: 'construction', desc: i18n.language === 'hi' ? 'निर्माण कार्य के लिए साधारण पोर्टलैंड सीमेंट 43 और 53 ग्रेड' : 'Ordinary Portland Cement 43 and 53 grade for construction' },
  ];

  const handleRecommend = async (e) => {
    e?.preventDefault();
    if (!productDesc.trim()) return;

    setRecLoading(true);
    setRecError(null);
    try {
      const data = await recommendStandard(productDesc);
      setRecResults(data);
    } catch (err) {
      setRecError(extractErrorMessage(err));
    } finally {
      setRecLoading(false);
    }
  };

  const handleSearchLabs = async (e, standardToSearch) => {
    if (e) e.preventDefault();
    const std = standardToSearch || standardQuery;
    if (!std.trim()) return;

    setLabLoading(true);
    setLabError(null);
    try {
      const data = await getTestingFacilities(std);
      setLabResults(data);
      const el = document.getElementById('facilities-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setLabError(extractErrorMessage(err));
    } finally {
      setLabLoading(false);
    }
  };

  const selectSample = (sample) => {
    setProductDesc(sample.desc);
    setSector(sample.sector);
  };

  const filteredLabs = labResults?.results?.filter(lab => {
    if (!labFilter) return true;
    const q = labFilter.toLowerCase();
    return (
      lab.lab_name?.toLowerCase().includes(q) ||
      lab.product?.toLowerCase().includes(q) ||
      lab.osl_code?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--sage-light)', color: 'var(--sage-dark)', border: '1px solid var(--sage-border)', padding: '0.25rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <Sparkles size={16} /> {t('standards_page_badge')}
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{t('standards_title')}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem', maxWidth: '750px', margin: '0.5rem auto 0', lineHeight: 1.6 }}>
            {t('standards_subtitle')}
          </p>
        </div>

        {/* Section 1: Standards Recommendation Wizard */}
        <div className="card" style={{ marginBottom: '3rem', borderTop: '4px solid var(--sage)' }}>
          <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--sage-light)', color: 'var(--sage-dark)', padding: '0.4rem', borderRadius: '8px' }}>
                <Layers size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('std_wizard_title')}</h3>
            </div>
            <span className="badge-sage">AI Powered</span>
          </div>

          <div className="card-body" style={{ padding: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {t('std_wizard_sub')}
            </p>

            {/* Quick Sample Selector */}
            <div style={{ marginBottom: '1.5rem', background: '#f8faf9', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                {t('try_sample_products')}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {sampleProducts.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSample(sample)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                  >
                    <Tag size={12} color="var(--sage)" />
                    <span>{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRecommend}>
              <div className="form-group">
                <label className="form-label">{t('product_desc_label')} *</label>
                <textarea
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder="e.g. Lithium-ion polymer cell for mobile power bank..."
                  rows={3}
                  className="form-textarea"
                  required
                />
              </div>

              {recError && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {recError}
                </div>
              )}

              <button
                type="submit"
                disabled={recLoading || !productDesc.trim()}
                className="btn btn-sage btn-lg"
                style={{ width: '100%' }}
              >
                {recLoading ? (
                  <span>{t('btn_analyzing_standards')}</span>
                ) : (
                  <>
                    <Search size={18} />
                    <span>{t('btn_find_standards')}</span>
                  </>
                )}
              </button>
            </form>

            {/* Recommendation Result Display */}
            {recResults && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--sage-light)', border: '1.5px solid var(--sage-border)', borderRadius: '14px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={24} color="var(--sage-dark)" />
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sage-dark)', margin: 0 }}>
                      {t('recommended_standard')}
                    </h4>
                  </div>
                  <span className="badge-sage" style={{ fontSize: '0.85rem' }}>
                    {recResults.scheme || 'CRS'} Scheme
                  </span>
                </div>

                <div style={{ display: 'inline-block', background: '#ffffff', padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--sage-border)', fontFamily: 'JetBrains Mono', fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1rem' }}>
                  {recResults.is_standard}
                </div>

                <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {recResults.notes || recResults.description || 'This standard is mandatory under Quality Control Orders (QCO) for all manufacturers and importers.'}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSearchLabs(null, recResults.is_standard.split(' ')[0] + ' ' + recResults.is_standard.split(' ')[1])}
                    className="btn btn-primary btn-sm"
                  >
                    <FlaskConical size={14} />
                    <span>Search Testing Labs for {recResults.is_standard}</span>
                  </button>
                  <a href="/quotation" className="btn btn-secondary btn-sm">
                    <span>Calculate Testing & Certification Fee</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Testing Facilities Directory */}
        <div id="facilities-section" className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="card-header" style={{ background: 'var(--surface-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '8px' }}>
                <FlaskConical size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('testing_facilities_title')}</h3>
            </div>
            <span className="badge-blue">NABL / OSL Directory</span>
          </div>

          <div className="card-body" style={{ padding: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {t('testing_facilities_sub')}
            </p>

            <form onSubmit={handleSearchLabs} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <input
                  type="text"
                  value={standardQuery}
                  onChange={(e) => setStandardQuery(e.target.value)}
                  placeholder="e.g. IS 16046, IS 16102, IS 269, IS 14543"
                  className="form-input uppercase"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={labLoading || !standardQuery.trim()}
                className="btn btn-primary"
              >
                {labLoading ? t('btn_searching_labs') : t('btn_search_labs')}
              </button>
            </form>

            {labError && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {labError}
              </div>
            )}

            {/* Labs Results Table */}
            {labResults && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Found <strong>{filteredLabs.length}</strong> accredited testing laboratories
                  </div>
                  <input
                    type="text"
                    value={labFilter}
                    onChange={(e) => setLabFilter(e.target.value)}
                    placeholder={t('filter_labs_placeholder')}
                    className="form-input"
                    style={{ maxWidth: '320px', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                  />
                </div>

                {filteredLabs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8faf9', borderRadius: '10px' }}>
                    No testing facilities matched your query. Try searching for "IS 16046" or "IS 16102".
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('table_lab_name')}</th>
                          <th>{t('table_product_grade')}</th>
                          <th>{t('table_standard')}</th>
                          <th>{t('table_charges')}</th>
                          <th>{t('table_validity')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLabs.map((lab, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{lab.lab_name}</div>
                              {lab.osl_code && (
                                <span className="badge-sage" style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>
                                  {lab.osl_code}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.875rem' }}>{lab.product || 'All compliant types'}</div>
                              {lab.grade_type_size && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lab.grade_type_size}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.85rem' }}>
                                {lab.indian_standard_no}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--sage-dark)' }}>
                                {lab.testing_charges || 'As per Tariff'}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>
                                {lab.validity_date || 'Active Validity'}
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
          </div>
        </div>
      </div>
    </div>
  );
}
