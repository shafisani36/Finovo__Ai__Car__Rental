import { useState } from 'react';
import type { FaqItem } from '../../../types';
import { Plus, Minus } from 'lucide-react';

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div
            key={item.id}
            style={{
              backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: isOpen ? '1px solid rgba(245, 183, 22, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              transition: 'all var(--transition-normal)',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                gap: '16px',
              }}
            >
              <span>{item.question}</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isOpen ? 'var(--color-accent-500)' : 'rgba(255, 255, 255, 0.08)',
                  color: isOpen ? 'var(--color-primary-950)' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {isOpen ? <Minus size={16} /> : <Plus size={16} />}
              </div>
            </button>

            {isOpen && (
              <div
                style={{
                  padding: '0 24px 20px 24px',
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  color: 'var(--text-white-secondary)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '16px',
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
