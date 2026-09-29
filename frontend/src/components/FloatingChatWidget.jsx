import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, BookOpen, AlertCircle, HelpCircle, Loader2, Calculator, Shield, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage } from '../api/client';

export default function FloatingChatWidget() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize/reset welcome message based on language
  useEffect(() => {
    const isHi = i18n.language === 'hi';
    const welcomeText = isHi
      ? 'नमस्ते! 🙏 मैं आपका बीआईएस विनियामक एवं मानक एआई सहायक हूँ। आप मुझसे भारतीय मानक (IS कोड), ISI मार्क, CRS पंजीकरण, हॉलमार्किंग नियम, परीक्षण शुल्क या लाइसेंस नवीनीकरण के बारे में कुछ भी पूछ सकते हैं!'
      : 'Namaste! 🙏 Hello! I am your AI BIS Regulatory & Compliance Assistant. Feel free to ask me anything about Indian Standards (IS), ISI marking, CRS certification, Hallmarking rules, testing fees, or license renewals!';

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        sources: isHi ? ['भारतीय मानक ब्यूरो अधिनियम 2016', 'मानकऑनलाइन गाइड'] : ['Bureau of Indian Standards Act 2016', 'Manakonline Guide'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [i18n.language]);

  // Listen for custom global event to open chat with specific query
  useEffect(() => {
    const handleTriggerChat = (event) => {
      if (event.detail?.query) {
        setIsOpen(true);
        handleSend(event.detail.query);
      }
    };
    window.addEventListener('bis-trigger-chat', handleTriggerChat);
    return () => window.removeEventListener('bis-trigger-chat', handleTriggerChat);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text);
      
      let botText = '';
      let botSources = [];

      if (typeof response === 'string') {
        botText = response;
      } else if (response && typeof response === 'object') {
        botText = response.answer || response.response || response.message || JSON.stringify(response);
        if (Array.isArray(response.sources)) {
          botSources = response.sources;
        } else if (response.source) {
          botSources = [response.source];
        }
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText || (i18n.language === 'hi' ? 'मैंने बीआईएस नियमों के अनुसार आपके प्रश्न का उत्तर तैयार किया है।' : 'I processed your query according to BIS regulations.'),
        sources: botSources.length > 0 ? botSources : ['BIS Knowledge Base'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: i18n.language === 'hi' 
          ? 'क्षमा करें, इस समय जानकारी प्राप्त करने में असमर्थ हूँ। कृपया कनेक्शन जांचें या पुनः प्रयास करें।'
          : 'Sorry, I could not retrieve information right now. Please verify backend connection or check your question.',
        isError: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const starterQuestions = [
    t('chat_q1'),
    t('chat_q2'),
    t('chat_q3'),
    t('chat_q4'),
    t('chat_q5'),
    t('chat_q6')
  ];

  const renderFormattedText = (content) => {
    if (!content) return '';
    const paragraphs = content.split('\n');
    return paragraphs.map((para, idx) => {
      if (!para.trim()) return <div key={idx} style={{ height: '0.4rem' }} />;
      
      const parts = para.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (para.trim().startsWith('•') || para.trim().startsWith('-') || /^\d+\./.test(para.trim())) {
        return (
          <div key={idx} style={{ paddingLeft: '0.75rem', marginBottom: '0.25rem' }}>
            {renderedParts}
          </div>
        );
      }

      return (
        <p key={idx} style={{ marginBottom: '0.35rem' }}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="floating-chat-btn"
        aria-label="Open AI BIS Assistant"
        title="Ask BIS AI Assistant"
      >
        <div className="chat-pulse" />
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="chat-drawer">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>{t('chat_header_title')}</h3>
                <p style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  {t('chat_header_sub')}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => setMessages([messages[0]])}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.3rem', opacity: 0.8 }}
                title="Reset conversation"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.3rem' }}
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.75rem', opacity: 0.85, fontWeight: 700 }}>
                  {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                  <span>{msg.sender === 'bot' ? t('chat_bot_name') : t('chat_user_name')}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{msg.time}</span>
                </div>

                <div style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>
                  {renderFormattedText(msg.text)}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-sources">
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <BookOpen size={11} />
                      <span>{t('chat_citations')}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {msg.sources.map((s, idx) => (
                        <span key={idx} style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="chat-msg bot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem' }}>{t('chat_analyzing')}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div style={{ padding: '0.6rem 0.85rem', background: '#f1f5f9', borderTop: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '0.4rem' }}>
            {starterQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isTyping}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--primary-dark)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="chat-input-area"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={t('chat_input_placeholder')}
              className="form-input"
              style={{ padding: '0.6rem 0.85rem', fontSize: '0.875rem' }}
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !inputQuery.trim()}
              className="btn btn-primary"
              style={{ padding: '0.6rem 0.9rem' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
