import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Sparkles, Send, Mic, Square, RotateCcw, Volume2, 
  Shield, CheckCircle2, XCircle, Loader2, BookOpen, Calculator, 
  Award, Building2, HelpCircle, Layers, Wrench, Globe, Copy, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { sendChatMessage, sendVoiceChatMessage, resetChatSession, checkHealth } from '../api/client';

export default function Assistant() {
  const { t, i18n } = useTranslation();
  const [sessionId, setSessionId] = useState('');
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [copiedSession, setCopiedSession] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);

  const currentLang = i18n.language || 'en';

  // 1. Initialize session and default greeting
  useEffect(() => {
    let savedId = localStorage.getItem('compliance_session_id');
    if (!savedId) {
      savedId = crypto.randomUUID();
      localStorage.setItem('compliance_session_id', savedId);
    }
    setSessionId(savedId);

    // Initial server health check
    checkHealth().then(res => setBackendStatus(res)).catch(() => setBackendStatus({ status: 'offline' }));

    const isHi = currentLang === 'hi';
    const initialGreeting = isHi
      ? `नमस्ते! 🙏 मैं आपका **BIS Sahayak (बी.आई.एस. सहायक)** आधिकारिक विनियामक अनुपालन अधिकारी हूँ।\n\nमैं भारतीय मानक ब्यूरो (**BIS**) और अन्य सांविधिक संस्थाओं (जैसे **FSSAI**) के नियमों में आपकी पूरी सहायता करूँगा:\n\n1. **भारतीय मानक (IS Codes)**: उत्पाद के अनुसार सटीक मानक और अनिवार्य QCOs।\n2. **प्रमाणीकरण योजनाएं**: **ISI मार्क (योजना I)**, **CRS इलेक्ट्रॉनिक्स (योजना II)**, और **स्वर्ण HUID हॉलमार्किंग**।\n3. **फैक्ट्री परीक्षण उपकरण (SIT)**: 1,850+ उत्पाद मैनुअल से इन-हाउस मशीनरी की सूची।\n4. **लाइसेंस नवीनीकरण (फॉर्म IX)**: 90/60/30-दिनों की समय-सीमा और ऑडिट चेकलिस्ट।\n5. **MSME 50% छूट एवं कोटेशन**: सरकारी शुल्क में 50% रियायत का त्वरित अनुमान।\n\nआप नीचे बोलकर (🎙️) अथवा लिखकर (⌨️) प्रश्न पूछ सकते हैं!`
      : `Namaste! 🙏 Hello! I am **BIS Sahayak**, the Official AI Compliance & Regulatory Intelligence Officer for Indian businesses.\n\nI provide authoritative, citation-backed guidance across the Bureau of Indian Standards (**BIS**) and statutory frameworks:\n\n1. **Indian Standards (IS Codes)**: Exact applicable IS numbers, Quality Control Orders (QCOs), and conformity requirements.\n2. **Certification Schemes**: **ISI Mark (Scheme I)** for domestic/foreign manufacturing, **CRS Scheme II** for electronics/IT goods, and **Gold HUID Hallmarking**.\n3. **Factory Testing Equipment (SIT)**: In-house testing machinery extracted from 1,850 official BIS product manuals.\n4. **License Renewals & Form IX**: 90/60/30-day countdown guidance and surveillance audit checklists.\n5. **MSME 50% Government Concession**: Itemized fee estimates with startup subsidies.\n\nYou can speak via microphone (🎙️) or type your inquiry in English, Hindi, or any regional Indian language below!`;

    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: initialGreeting,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      }
    ]);
  }, [currentLang]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // 2. Send Text Query
  const handleSendText = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading || isRecording) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(text, sessionId);
      const botAnswer = data.answer || data.response || "Regulatory analysis completed.";
      
      const assistantMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: botAnswer,
        timestamp: new Date().toISOString(),
        needsConfirmation: data.needs_confirmation === true
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (data.active_business) {
        setActiveBusiness(data.active_business);
      }
    } catch (err) {
      const errorMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `⚠️ **Network Notice**: Unable to connect to compliance engine (${err.message || 'Check connection'}). Please try again.`,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Audio Recording Handling
  const startRecording = async () => {
    if (isLoading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await handleSendVoice(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission was denied or no recording device is available. Please allow microphone access in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendVoice = async (audioBlob) => {
    setIsLoading(true);
    try {
      const data = await sendVoiceChatMessage(audioBlob, sessionId);

      if (data.transcription) {
        const userVoiceMsg = {
          id: crypto.randomUUID(),
          sender: 'user',
          text: data.transcription,
          transcription: data.transcription,
          timestamp: new Date().toISOString(),
        };

        const assistantMsg = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: data.answer || "Voice query processed.",
          timestamp: new Date().toISOString(),
          needsConfirmation: data.needs_confirmation === true
        };

        setMessages((prev) => [...prev, userVoiceMsg, assistantMsg]);
      } else {
        const assistantMsg = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: data.answer || "Could not transcribe audio. Please type your query in text.",
          timestamp: new Date().toISOString(),
          needsConfirmation: false
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }

      if (data.active_business) {
        setActiveBusiness(data.active_business);
      }
    } catch (err) {
      alert(`Voice transmission failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Topic Switch Confirmation
  const handleConfirmSwitch = (choice) => {
    handleSendText(choice);
  };

  // 5. Reset Session
  const handleResetSession = async () => {
    if (isLoading) return;
    try {
      await resetChatSession(sessionId);
    } catch (e) {
      console.warn("Session reset warning:", e);
    }

    const freshId = crypto.randomUUID();
    localStorage.setItem('compliance_session_id', freshId);
    setSessionId(freshId);
    setActiveBusiness(null);

    const isHi = currentLang === 'hi';
    const resetMsg = isHi 
      ? 'सत्र सफलतापूर्वक रीसेट हो गया है। आप किस नए व्यवसाय, उत्पाद या मानक के बारे में चर्चा करना चाहते हैं?'
      : 'Session reset successfully. What new business, standard, or product would you like to explore?';

    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `🔄 **${resetMsg}**`,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      }
    ]);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  const quickPrompts = [
    { label: "Packaged Water (IS 14543)", query: "I want to start a packaged drinking water plant. What are the mandatory BIS and FSSAI requirements?" },
    { label: "Cement Plant Machinery (IS 269)", query: "What in-house testing equipment (SIT) is mandatory for an Ordinary Portland Cement factory under IS 269?" },
    { label: "Power Bank CRS Registration", query: "How to register Lithium-ion Power Banks under CRS Scheme II (IS 16046)?" },
    { label: "Gold HUID Hallmarking", query: "What are the rules for 6-digit HUID hallmarking and 22K (916) purity certification?" },
    { label: "MSME 50% Subsidy Calculation", query: "How does the MSME 50% concession apply to BIS application and annual marking fees?" },
    { label: "Restaurant FSSAI vs BIS Scope", query: "I want to open a cafe and restaurant. Do I need a BIS license or FSSAI license?" },
    { label: "Form IX License Renewal", query: "What is the procedure and checklist for Form IX license renewal before expiration?" }
  ];

  const panIndianLanguages = [
    { name: "English", sample: "How to get ISI mark?" },
    { name: "हिन्दी (Hindi)", sample: "सीमेंट फैक्ट्री लगाने के लिए कौन से टेस्ट उपकरण चाहिए?" },
    { name: "मराठी (Marathi)", sample: "पाणी बॉटलिंग प्लांटसाठी BIS परवाना कसा मिळवायचा?" },
    { name: "ગુજરાતી (Gujarati)", sample: "સોનાના હોલમાર્ક HUID કોડની ચકાસણી કેવી રીતે કરવી?" },
    { name: "தமிழ் (Tamil)", sample: "மின்னணு பொருட்களுக்கான CRS பதிவு செய்வது எப்படி?" },
    { name: "తెలుగు (Telugu)", sample: "లిథియం బ్యాటరీలకు BIS ధృవీకరణ ఎలా పొందాలి?" },
    { name: "ಕನ್ನಡ (Kannada)", sample: "ಪ್ಯಾಕೇಜ್ಡ್ ಕುಡಿಯುವ ನೀರಿಗೆ BIS ಪರವಾನಗಿ ನಿಯಮಗಳು ಯಾವುವು?" },
    { name: "বাংলা (Bengali)", sample: "সিমেন্ট কারখানার জন্য কি কি ল্যাব টেস্ট সরঞ্জাম প্রয়োজন?" }
  ];

  return (
    <div className="container" style={{ paddingBottom: '4rem', paddingTop: '1.5rem' }}>
      
      {/* 1. Breadcrumb & Page Hero Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>AI Regulatory Assistant (बी.आई.एस. सहायक)</span>
        </div>

        <div className="card" style={{ background: 'var(--primary-gradient)', color: 'white', border: 'none', padding: '1.75rem 2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ maxWidth: '780px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                <Sparkles size={13} color="#fcd34d" />
                <span>Pan-Indian Multilingual & Voice Regulatory Intelligence</span>
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                BIS Sahayak: Statutory AI Compliance Officer
              </h1>
              <p style={{ color: '#d1e0f3', fontSize: '0.925rem', lineHeight: 1.6 }}>
                Grounded in the <strong>Bureau of Indian Standards Act 2016</strong>, 1,850+ factory testing manuals (**SIT**), Quality Control Orders (**QCOs**), and FSSAI statutory boundaries with speech-to-text voice recognition.
              </p>
            </div>

            {/* Session Controller Header Pill */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(10, 25, 47, 0.6)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                <span style={{ color: '#9db2a6' }}>Session ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#6ee7b7', fontWeight: 700 }}>
                  {sessionId ? `${sessionId.slice(0, 8)}...` : 'Connecting...'}
                </span>
                <button 
                  onClick={copySessionId}
                  title="Copy full session UUID"
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'flex' }}
                >
                  {copiedSession ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleResetSession}
                  className="btn btn-sm"
                  style={{ background: 'rgba(255, 255, 255, 0.15)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Reset Topic</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span>{backendStatus?.model || 'Railway Engine Online'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Three-Column Executive Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr 310px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* =========================================================================
            COLUMN 1: SESSION CONTROLLER & REGULATORY TOPIC NAVIGATOR
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Topic Lock Card */}
          <div className="card" style={{ border: '1px solid var(--border-strong)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)' }}>
                <Layers size={16} color="var(--sage)" />
                <span>Active Discussion Topic</span>
              </div>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeBusiness ? '#059669' : '#3b82f6', display: 'inline-block', boxShadow: activeBusiness ? '0 0 8px #10b981' : 'none' }} />
            </div>

            <div style={{ background: activeBusiness ? 'var(--sage-light)' : 'var(--surface-muted)', border: `1px solid ${activeBusiness ? 'var(--sage-border)' : 'var(--border)'}`, padding: '0.85rem', borderRadius: '8px', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                Industry / Product Locked:
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: activeBusiness ? 'var(--sage-dark)' : 'var(--text-main)', wordBreak: 'break-word' }}>
                {activeBusiness || "None (Open Inquiry)"}
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
              {activeBusiness 
                ? "All follow-up questions are strictly anchored to this industry standard until you switch topic." 
                : "Ask about any manufactured good to lock the regulatory session to that industry."}
            </p>

            {activeBusiness && (
              <button 
                onClick={handleResetSession}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <RotateCcw size={13} />
                <span>Unlock & Switch Topic</span>
              </button>
            )}
          </div>

          {/* Scheme Quick Launch Filter */}
          <div className="card" style={{ border: '1px solid var(--border-strong)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)', marginBottom: '0.85rem' }}>
              <Shield size={16} color="var(--primary)" />
              <span>Conformity Schemes</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => handleSendText("Tell me the complete process and required documents for ISI Mark Scheme I")}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                🏭 <strong>ISI Mark (Scheme I)</strong> - Heavy & Industrial
              </button>
              <button
                onClick={() => handleSendText("How to register electronic IT goods under Compulsory Registration Scheme (CRS Scheme II)?")}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                ⚡ <strong>CRS Scheme II</strong> - Electronics & IT
              </button>
              <button
                onClick={() => handleSendText("What is the mandatory procedure for Gold Jewellery Hallmarking and 6-digit HUID registration?")}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                💎 <strong>Hallmarking (Scheme IV)</strong> - Gold & HUID
              </button>
              <button
                onClick={() => handleSendText("What is the difference between BIS and FSSAI for food businesses?")}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                🍽️ <strong>FSSAI vs BIS Jurisdiction</strong>
              </button>
              <button
                onClick={() => handleSendText("What is the step by step procedure for Form IX license renewal?")}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                ⏳ <strong>Form IX Renewal Checklist</strong>
              </button>
            </div>
          </div>

          {/* Pan-Indian Language Hub */}
          <div className="card" style={{ border: '1px solid var(--border-strong)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)', marginBottom: '0.65rem' }}>
              <Globe size={16} color="var(--sage)" />
              <span>Supported Indian Languages</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Click any regional language prompt to query the engine directly:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {panIndianLanguages.map((lang, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendText(lang.sample)}
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    color: 'var(--text-body)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sage)'; e.currentTarget.style.background = 'var(--sage-light)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-alt)'; }}
                >
                  <strong style={{ color: 'var(--primary-dark)', fontSize: '0.75rem' }}>{lang.name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>"{lang.sample.slice(0, 38)}..."</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* =========================================================================
            COLUMN 2: CONVERSATIONAL STREAM & VOICE INPUT (CENTER STAGE)
            ========================================================================= */}
        <div className="card" style={{ border: '1px solid var(--border-strong)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '780px', background: 'var(--surface)' }}>
          
          {/* Stream Header */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)' }}>
                  BIS Regulatory Dialogue Stream
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Status: <span style={{ color: 'var(--success-text)', fontWeight: 700 }}>● Active RAG Session</span> ({messages.length} messages)
                </div>
              </div>
            </div>

            {/* Clear history button */}
            <button
              onClick={handleResetSession}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              title="Clear conversation stream"
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          </div>

          {/* Messages Viewport */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fbfdfc' }}>
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isLast = index === messages.length - 1;

              return (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  {!isUser && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--sage-light)', border: '1px solid var(--sage-border)', color: 'var(--sage-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Bot size={17} />
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '1rem 1.15rem',
                      borderRadius: '12px',
                      background: isUser ? 'var(--primary-gradient)' : '#ffffff',
                      color: isUser ? 'white' : 'var(--text-body)',
                      border: isUser ? 'none' : '1px solid var(--border-strong)',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: '0.875rem',
                      lineHeight: 1.65
                    }}
                  >
                    {/* Voice Spoken Badge */}
                    {msg.transcription && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', color: '#fef08a', fontWeight: 600 }}>
                        <Volume2 size={14} />
                        <span>🎙️ Spoken Voice Note: <em>"{msg.transcription}"</em></span>
                      </div>
                    )}

                    {/* Markdown Output */}
                    <div className="prose prose-sm max-w-none" style={{ color: isUser ? 'white' : 'var(--text-body)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* Topic Switch Confirmation Action Bar */}
                    {msg.needsConfirmation && isLast && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleConfirmSwitch("Yes")}
                          className="btn btn-sm"
                          style={{ background: '#059669', color: 'white', borderColor: '#059669', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <CheckCircle2 size={14} />
                          <span>✅ Yes, Switch Business</span>
                        </button>
                        <button
                          onClick={() => handleConfirmSwitch("No")}
                          className="btn btn-sm"
                          style={{ background: '#dc2626', color: 'white', borderColor: '#dc2626', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <XCircle size={14} />
                          <span>❌ No, Stay on Current Topic</span>
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem', fontSize: '0.675rem', color: isUser ? '#cbd5e1' : 'var(--text-light)' }}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>

                  {isUser && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', border: '1px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <User size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--sage-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage-dark)' }}>
                  <Bot size={17} />
                </div>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-strong)', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={15} className="animate-spin" color="var(--sage)" />
                  <span>Searching BIS vector database, SIT manuals, and regulations...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (Top of input) */}
          <div style={{ padding: '0.5rem 1rem', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {quickPrompts.slice(0, 4).map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendText(p.query)}
                disabled={isLoading || isRecording}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.7rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                💡 {p.label}
              </button>
            ))}
          </div>

          {/* Bottom Interactive Input Bar */}
          <div style={{ padding: '0.85rem 1.25rem', background: '#ffffff', borderTop: '1px solid var(--border)' }}>
            {isRecording ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.8rem', color: 'var(--danger-text)', fontWeight: 700 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  <span>Recording Speech ({recordingSeconds}s)... Speak clearly in any Indian language</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn btn-danger btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  <Square size={13} fill="currentColor" />
                  <span>Stop & Send Voice</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading}
                  title="Click to speak (Voice recognition via Groq Whisper in English, Hindi, Marathi, etc.)"
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 0.85rem', color: 'var(--primary)', borderColor: 'var(--border-strong)', background: 'var(--surface-muted)' }}
                >
                  <Mic size={18} color="var(--primary)" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Ask about Indian standards, factory test machinery (SIT), licensing, or fees..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendText();
                  }}
                  disabled={isLoading || isRecording}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-strong)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendText()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* =========================================================================
            COLUMN 3: STATUTORY KNOWLEDGE & SIT MACHINERY INSPECTOR
            ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* SIT Machinery Checklist Card */}
          <div className="card" style={{ border: '1px solid var(--border-strong)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)', marginBottom: '0.65rem' }}>
              <Wrench size={16} color="var(--sage)" />
              <span>SIT Testing Machinery</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Under Scheme I & II, manufacturers must possess mandatory in-house testing equipment verified during factory audits:
            </p>

            <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-body)' }}>
                <CheckCircle2 size={13} color="var(--sage)" />
                <span>Calibrated Tensile / Compressive Tester</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-body)' }}>
                <CheckCircle2 size={13} color="var(--sage)" />
                <span>Digital Micrometer & Vernier Caliper</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-body)' }}>
                <CheckCircle2 size={13} color="var(--sage)" />
                <span>Thermal Conditioning Chamber</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-body)' }}>
                <CheckCircle2 size={13} color="var(--sage)" />
                <span>Microbiological Autoclave / TDS Meter</span>
              </div>
            </div>
          </div>

          {/* Statutory Matrix Card */}
          <div className="card" style={{ border: '1px solid var(--border-strong)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem', color: 'var(--primary-dark)', marginBottom: '0.65rem' }}>
              <BookOpen size={16} color="var(--primary)" />
              <span>Statutory Matrix</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                <strong style={{ color: 'var(--primary-dark)', display: 'block' }}>Bureau of Indian Standards (BIS):</strong>
                <span style={{ color: 'var(--text-body)' }}>Physical manufacturing, electronics conformity, gold hallmarking, and technical IS codes.</span>
              </div>
              <div style={{ padding: '0.5rem', background: 'var(--sage-light)', borderRadius: '6px', borderLeft: '3px solid var(--sage)' }}>
                <strong style={{ color: 'var(--sage-dark)', display: 'block' }}>FSSAI FoSCoS Authority:</strong>
                <span style={{ color: 'var(--text-body)' }}>Food premises, restaurant kitchens, catering, and consumables safety licensing.</span>
              </div>
            </div>
          </div>

          {/* Direct Navigation Action Card */}
          <div className="card" style={{ border: '1px solid var(--sage-border)', background: 'var(--sage-light)', padding: '1.25rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--sage-dark)', marginBottom: '0.5rem' }}>
              Quick Action Center
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/quotation" className="btn btn-sage btn-sm" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                <Calculator size={14} />
                <span>Calculate Compliance Cost</span>
              </Link>
              <Link to="/standards" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                <Sparkles size={14} />
                <span>Find Standards & Labs</span>
              </Link>
              <Link to="/verify" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                <Award size={14} />
                <span>Verify Hallmark HUID</span>
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
