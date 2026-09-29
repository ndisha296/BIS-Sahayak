import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Sparkles, BookOpen, 
  AlertCircle, Mic, Square, RotateCcw, Volume2, Shield, 
  CheckCircle2, XCircle, Loader2, Sparkle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { sendChatMessage, sendVoiceChatMessage, resetChatSession } from '../api/client';

export default function FloatingChatWidget() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);

  // 1. Initialize persistent session UUID
  useEffect(() => {
    let savedId = localStorage.getItem('compliance_session_id');
    if (!savedId) {
      savedId = crypto.randomUUID();
      localStorage.setItem('compliance_session_id', savedId);
    }
    setSessionId(savedId);

    const isHi = i18n.language === 'hi';
    const welcomeText = isHi
      ? 'नमस्ते! 🙏 मैं आपका **BIS Sahayak (बी.आई.एस. सहायक)** एआई अनुपालन अधिकारी हूँ।\n\nआप मुझसे भारतीय मानक (**IS Codes**), **ISI मार्क (योजना I)**, **CRS इलेक्ट्रॉनिक्स (योजना II)**, **स्वर्ण HUID हॉलमार्किंग**, परीक्षण उपकरण या **फॉर्म IX लाइसेंस नवीनीकरण** के बारे में कुछ भी पूछ सकते हैं!'
      : 'Namaste! 🙏 Hello! I am **BIS Sahayak**, your AI Regulatory Compliance & Standards Intelligence Officer.\n\nAsk me about **Indian Standards (IS Codes)**, **ISI Mark (Scheme I)**, **CRS Registration (Scheme II)**, **Gold HUID Hallmarking**, testing equipment (**SIT**), or **Form IX License Renewals**!';

    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      }
    ]);
  }, [i18n.language]);

  // Listen for custom global event to open chat with specific query
  useEffect(() => {
    const handleTriggerChat = (event) => {
      if (event.detail?.query) {
        setIsOpen(true);
        handleSendText(event.detail.query);
      }
    };
    window.addEventListener('bis-trigger-chat', handleTriggerChat);
    return () => window.removeEventListener('bis-trigger-chat', handleTriggerChat);
  }, [sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Timer for audio recording
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
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading || isRecording) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(text, sessionId);
      const botAnswer = data.answer || data.response || "No response received.";
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
        text: `⚠️ **Network Notice**: Unable to reach compliance engine (${err.message || 'Check connection'}). Please try again.`,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Audio Recording Handling (MediaRecorder)
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
      alert("Microphone permission was denied or no recording device is available. Please allow mic access in your browser settings.");
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
          text: data.answer || "Could not transcribe audio. Please type your question.",
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

  // 5. Reset Active Session
  const handleResetSession = async () => {
    if (isLoading) return;
    try {
      await resetChatSession(sessionId);
    } catch (e) {
      console.warn("Session reset notice:", e);
    }

    const freshId = crypto.randomUUID();
    localStorage.setItem('compliance_session_id', freshId);
    setSessionId(freshId);
    setActiveBusiness(null);

    const isHi = i18n.language === 'hi';
    const resetText = isHi 
      ? 'सत्र रीसेट हो गया है। आप किस नए व्यवसाय, उत्पाद या मानक के बारे में चर्चा करना चाहते हैं?' 
      : 'Session reset successfully. What new business, standard, or product would you like to explore?';

    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `🔄 **${resetText}**`,
        timestamp: new Date().toISOString(),
        needsConfirmation: false
      }
    ]);
  };

  const starterQuestions = [
    "Packaged Drinking Water (IS 14543) requirements?",
    "What test equipment is needed for Cement factory?",
    "How to register Power Bank under CRS Scheme II?",
    "What are the fees and MSME 50% discount?",
    "How to verify 6-digit Gold HUID hallmark?",
    "Form IX license renewal checklist"
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 group border border-white/20"
        aria-label="Open BIS Sahayak Assistant"
      >
        <div className="relative">
          <Bot className="w-7 h-7 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
        </div>
        <div className="hidden sm:flex flex-col text-left pr-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-200">BIS Sahayak</span>
          <span className="text-sm font-bold text-white flex items-center gap-1.5">
            AI Assistant & Voice <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          </span>
        </div>
      </button>

      {/* Slide-out & Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[95vw] sm:w-[460px] h-[640px] max-h-[85vh] z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header Bar */}
          <header className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">BIS Sahayak (बी.आई.एस. सहायक)</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live RAG
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Topic: <strong className="text-indigo-300 font-medium">{activeBusiness || "Open Inquiry"}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetSession}
                title="Reset active topic & session memory"
                className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 border border-transparent hover:border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Reset</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Pan-Indian Languages Badge */}
          <div className="px-4 py-1.5 bg-slate-950/70 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              🌐 Multilingual & Voice:
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="px-1 rounded bg-slate-800 text-blue-300">English</span>
              <span className="px-1 rounded bg-slate-800 text-amber-300">हिन्दी</span>
              <span className="px-1 rounded bg-slate-800 text-orange-300">मराठी</span>
              <span className="px-1 rounded bg-slate-800 text-emerald-300">ગુજરાતી</span>
              <span className="px-1 rounded bg-slate-800 text-purple-300">தமிழ்</span>
              <span className="px-1 rounded bg-slate-800 text-sky-300">తెలుగు</span>
              <span className="px-1 rounded bg-slate-800 text-pink-300">বাংলা</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-slate-900/60 custom-scrollbar">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isLast = index === messages.length - 1;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-300 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/80'
                    }`}
                  >
                    {/* Voice Spoken Badge */}
                    {msg.transcription && (
                      <div className="mb-2 pb-1.5 border-b border-white/20 text-xs flex items-center gap-1.5 text-blue-200">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                        <span>🎙️ Spoken: <em>"{msg.transcription}"</em></span>
                      </div>
                    )}

                    {/* Markdown Formatted Body */}
                    <div className="prose prose-invert prose-sm max-w-none text-slate-100 leading-relaxed space-y-2 prose-headings:text-indigo-300 prose-strong:text-white prose-table:border-collapse prose-th:border prose-th:border-slate-600 prose-th:p-1.5 prose-td:border prose-td:border-slate-700 prose-td:p-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* Inline Topic Switch Action Buttons */}
                    {msg.needsConfirmation && isLast && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700 flex flex-wrap gap-2 animate-in fade-in">
                        <button
                          onClick={() => handleConfirmSwitch("Yes")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ✅ Yes, Switch Business
                        </button>
                        <button
                          onClick={() => handleConfirmSwitch("No")}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          ❌ No, Keep Current Topic
                        </button>
                      </div>
                    )}

                    <div className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                      <span>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center flex-shrink-0 text-blue-300 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-800/90 text-slate-300 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700/80 flex items-center gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Searching BIS vector database & SIT machinery tables...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
              {starterQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendText(q)}
                  disabled={isLoading || isRecording}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-slate-800 hover:bg-indigo-900/60 text-slate-300 hover:text-white border border-slate-700/80 transition-all text-left flex items-center gap-1"
                >
                  <Sparkle className="w-2.5 h-2.5 text-amber-400" />
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Area with Voice & Text Buttons */}
          <footer className="p-3 bg-slate-950 border-t border-slate-800/80">
            {isRecording ? (
              <div className="flex items-center justify-between p-2.5 bg-rose-950/60 border border-rose-600/50 rounded-xl text-rose-200 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
                  <span>Recording Voice ({recordingSeconds}s)... Speak now in any language</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  Done / Send
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Voice Record Button */}
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading}
                  title="Click to speak in Hindi, English, Marathi, Tamil, etc."
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center flex-shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <Mic className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Ask about IS standards, SIT machinery, or fees (English / हिन्दी)..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendText();
                  }}
                  disabled={isLoading || isRecording}
                  className="flex-1 bg-slate-900 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendText()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </footer>

        </div>
      )}
    </>
  );
}
