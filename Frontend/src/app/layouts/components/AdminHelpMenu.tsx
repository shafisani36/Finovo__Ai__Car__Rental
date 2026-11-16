import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  KeyRound,
  ScanLine,
  MessageSquareWarning,
  TicketPercent,
  CarFront,
  CalendarPlus,
  Mail,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { useSiteInfo, telHref } from '../../../hooks/usePublicSite';
import { useDismissable } from './useDismissable';
import './header-panels.css';

interface HelpGuide {
  key: string;
  icon: LucideIcon;
  tone: string;
  link: string;
}

/** Short how-to guides for the everyday admin tasks; each one opens the page where the task is done. */
const GUIDES: HelpGuide[] = [
  { key: 'handover', icon: KeyRound, tone: 'amber', link: '/admin/rentals' },
  { key: 'inspection', icon: ScanLine, tone: 'blue', link: '/admin/inspections/new' },
  { key: 'disputes', icon: MessageSquareWarning, tone: 'red', link: '/admin/disputes' },
  { key: 'booking', icon: CalendarPlus, tone: 'green', link: '/admin/bookings/new' },
  { key: 'car', icon: CarFront, tone: 'purple', link: '/admin/cars/new' },
  { key: 'promo', icon: TicketPercent, tone: 'purple', link: '/admin/promo-codes' },
];

/** Question mark in the admin header: quick guides and how to reach support. */
export function AdminHelpMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const site = useSiteInfo();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  useDismissable(anchorRef, isOpen, close);

  const openGuide = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  const hasContact = Boolean(site?.supportEmail || site?.supportPhone);

  return (
    <div className="admin-header-panel-anchor" ref={anchorRef}>
      <button
        type="button"
        className="admin-header-icon-btn admin-header-help-btn"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t('adminPages.layout.help')}
        title={t('adminPages.layout.help')}
      >
        <HelpCircle size={19} />
      </button>

      {isOpen && (
        <div className="admin-header-panel" role="dialog" aria-label={t('adminPages.layout.help')}>
          <div className="admin-header-panel-head">
            <div>
              <h2 className="admin-header-panel-title">{t('adminPages.adminHelp.title')}</h2>
              <p className="admin-header-panel-subtitle">{t('adminPages.adminHelp.subtitle')}</p>
            </div>
          </div>

          <div className="admin-header-panel-body">
            <p className="admin-header-panel-section-label">{t('adminPages.adminHelp.guides')}</p>
            {GUIDES.map((guide) => {
              const Icon = guide.icon;
              return (
                <button type="button" key={guide.key} className="admin-header-panel-item" onClick={() => openGuide(guide.link)}>
                  <span className={`admin-header-panel-item-icon tone-${guide.tone}`}>
                    <Icon size={17} />
                  </span>
                  <span className="admin-header-panel-item-text">
                    <span className="admin-header-panel-item-title">{t(`adminPages.adminHelp.${guide.key}Title`)}</span>
                    <span className="admin-header-panel-item-desc">{t(`adminPages.adminHelp.${guide.key}Text`)}</span>
                  </span>
                </button>
              );
            })}

            {hasContact && (
              <>
                <p className="admin-header-panel-section-label">{t('adminPages.adminHelp.contact')}</p>
                {site?.supportEmail && (
                  <a className="admin-header-panel-item" href={`mailto:${site.supportEmail}`}>
                    <span className="admin-header-panel-item-icon tone-purple">
                      <Mail size={17} />
                    </span>
                    <span className="admin-header-panel-item-text">
                      <span className="admin-header-panel-item-title">{t('adminPages.adminHelp.email')}</span>
                      <span className="admin-header-panel-item-desc">{site.supportEmail}</span>
                    </span>
                  </a>
                )}
                {site?.supportPhone && (
                  <a className="admin-header-panel-item" href={telHref(site.supportPhone)}>
                    <span className="admin-header-panel-item-icon tone-green">
                      <Phone size={17} />
                    </span>
                    <span className="admin-header-panel-item-text">
                      <span className="admin-header-panel-item-title">{t('adminPages.adminHelp.phone')}</span>
                      <span className="admin-header-panel-item-desc" dir="ltr">
                        {site.supportPhone}
                      </span>
                    </span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
