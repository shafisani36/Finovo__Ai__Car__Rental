import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { customerPortalApi } from '../api/customerPortalApi';
import './CustomerPortal.css';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  suggestedVehicles?: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    image?: string | null;
  }>;
}

const INITIAL_SUGGESTIONS = [
  'Recommend a luxury SUV for a family trip',
  'What is the security deposit and refund policy?',
  'How does AI vehicle inspection protect me from false damage charges?',
  'Find an Electric Vehicle (EV) available this weekend',
];

export function CustomerAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! I'm your Finovo AI Concierge. I can help you choose the ideal vehicle from our live fleet, clarify our zero-deposit or insurance policies, or guide you through your rental schedule. How can I assist you today?",
      time: 'Just now',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputPrompt('');
    setIsTyping(true);

    try {
      const res = await customerPortalApi.askAiAssistant(textToSend);
      if (res.success) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedVehicles: res.suggestedVehicles,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      console.error('AI assistant error:', err);
      const errorMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: "I'm having a brief issue accessing our vehicle database. However, you can browse all verified available cars directly in our Fleet directory.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="cp-page-container" style={{ maxWidth: '1000px' }}>
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="cp-badge cp-badge-accent">
              <Sparkles size={14} /> AI Concierge 2.0
            </span>
            <span className="cp-badge cp-badge-success">Live Fleet Connected</span>
          </div>
          <h1 className="cp-page-title">Personal AI Rental Assistant</h1>
          <p className="cp-page-subtitle">
            Get instant recommendations, check trip policies, and book vehicles in natural language.
          </p>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            className="cp-btn-outline"
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              borderRadius: '999px',
              background: '#FFFFFF',
            }}
            onClick={() => handleSendMessage(suggestion)}
          >
            <Zap size={13} color="#FAB826" />
            {suggestion}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div
        className="cp-card"
        style={{
          height: 'clamp(460px, 66vh, 660px)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(14px, 2.5vw, 20px)',
          background: '#FFFFFF',
        }}
      >
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isAi ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  flexDirection: isAi ? 'row' : 'row-reverse',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isAi ? 'var(--cp-accent)' : 'var(--cp-primary)',
                    color: isAi ? 'var(--cp-primary)' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isAi ? <Bot size={18} /> : <User size={18} />}
                </div>

                {/* Bubble */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      background: isAi ? '#F8F6F9' : 'var(--cp-primary)',
                      color: isAi ? 'var(--cp-text-main)' : '#FFFFFF',
                      padding: '14px 18px',
                      borderRadius: isAi ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      fontSize: '0.92rem',
                      lineHeight: '1.5',
                      boxShadow: 'var(--cp-shadow-sm)',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Vehicle Recommendations Cards */}
                  {msg.suggestedVehicles && msg.suggestedVehicles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '4px' }}>
                      {msg.suggestedVehicles.map((car) => (
                        <div
                          key={car.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--cp-border)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: 'var(--cp-shadow-sm)',
                          }}
                        >
                          <div style={{ height: '90px', background: '#F1EEF4' }}>
                            <img
                              src={car.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80'}
                              alt={car.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>{car.category}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--cp-primary)' }}>{car.name}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--cp-primary)' }}>${car.price} / day</div>
                            <Link
                              to={`/customer/bookings/new?vehicleId=${car.id}`}
                              className="cp-btn-primary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', marginTop: '6px', textAlign: 'center' }}
                            >
                              Reserve Now
                              <ArrowRight size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '0.72rem', color: 'var(--cp-text-subtle)', alignSelf: isAi ? 'flex-start' : 'flex-end' }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', alignItems: 'center' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--cp-accent)',
                  color: 'var(--cp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  background: '#F8F6F9',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  color: 'var(--cp-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="cp-badge cp-badge-accent">Finovo AI is analyzing fleet...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="cp-input"
            placeholder="Ask about cars, rental prices, airport pickup, or insurance..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
          />
          <button
            className="cp-btn-primary"
            disabled={isTyping || !inputPrompt.trim()}
            onClick={() => handleSendMessage()}
          >
            <Send size={16} />
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
}
