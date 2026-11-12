import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Cookie, FileText, Mail, Phone, ShieldCheck } from 'lucide-react';
import { telHref, useSiteInfo } from '../../hooks/usePublicSite';

export type LegalKind = 'privacy' | 'terms' | 'cookies';

/** Date the legal copy was last reviewed; change it whenever the text in the locale files changes. */
const LEGAL_LAST_UPDATED = '2026-11-12';

const SECTION_COUNT: Record<LegalKind, number> = { privacy: 8, terms: 8, cookies: 5 };

const ICONS: Record<LegalKind, typeof ShieldCheck> = { privacy: ShieldCheck, terms: FileText, cookies: Cookie };

const OTHER_PAGES: { kind: LegalKind; path: string; labelKey: string }[] = [
  { kind: 'privacy', path: '/privacy', labelKey: 'footer.privacyPolicy' },
  { kind: 'terms', path: '/terms', labelKey: 'footer.termsOfService' },
  { kind: 'cookies', path: '/cookies', labelKey: 'footer.cookiePolicy' },
];

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, i18n } = useTranslation();
  const site = useSiteInfo();
  const Icon = ICONS[kind];
  const company = site?.companyName || t('common.appName');

  const sections = Array.from({ length: SECTION_COUNT[kind] }, (_, index) => ({
    id: `section-${index + 1}`,
    title: t(`legal.${kind}.s${index + 1}Title`),
    body: t(`legal.${kind}.s${index + 1}Body`),
  }));

  const updatedOn = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(`${LEGAL_LAST_UPDATED}T00:00:00`)
  );

  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="container legal-hero-inner">
          <span className="legal-hero-icon" aria-hidden="true">
            <Icon size={26} />
          </span>
          <h1>{t(`legal.${kind}.title`)}</h1>
          <p className="legal-hero-intro">{t(`legal.${kind}.intro`)}</p>
          <p className="legal-hero-date">{t('legal.common.lastUpdated', { date: updatedOn })}</p>
        </div>
      </section>

      <div className="container legal-layout">
        <aside className="legal-toc" aria-label={t('legal.common.onThisPage')}>
          <p className="legal-toc-title">{t('legal.common.onThisPage')}</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
          <nav className="legal-toc-links">
            {OTHER_PAGES.filter((page) => page.kind !== kind).map((page) => (
              <Link key={page.kind} to={page.path}>
                {t(page.labelKey)}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="legal-content">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="legal-section">
              <h2>
                <span className="legal-section-number">{index + 1}</span>
                {section.title}
              </h2>
              <p>{section.body}</p>
            </section>
          ))}

          <div className="legal-contact">
            <h2>{t('legal.common.contactTitle')}</h2>
            <p>{t('legal.common.contactBody', { company })}</p>
            <div className="legal-contact-links">
              {site?.supportEmail && (
                <a href={`mailto:${site.supportEmail}`}>
                  <Mail size={16} />
                  <span>{site.supportEmail}</span>
                </a>
              )}
              {site?.supportPhone && (
                <a href={telHref(site.supportPhone)} className="phone-number">
                  <Phone size={16} />
                  <span>{site.supportPhone}</span>
                </a>
              )}
              <Link to="/contact">{t('nav.contact')}</Link>
            </div>
          </div>
        </article>
      </div>

      <style>{`
        .legal-page {
          background: #FAF8FC;
          min-height: 100vh;
          padding-bottom: 72px;
        }
        .legal-hero {
          background: linear-gradient(155deg, #160122 0%, #2C0644 55%, #4C126E 100%);
          color: #FFFFFF;
          padding: 128px 0 56px;
        }
        .legal-hero-inner > h1,
        .legal-hero-inner > p {
          max-width: 820px;
        }
        .legal-hero-icon {
          display: inline-grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(250, 184, 38, 0.14);
          color: #FAB826;
          margin-bottom: 18px;
        }
        .legal-hero h1 {
          font-family: var(--font-family-heading);
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin: 0 0 12px;
          line-height: 1.15;
        }
        .legal-hero-intro {
          font-size: 1.05rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.82);
          margin: 0 0 14px;
        }
        .legal-hero-date {
          font-size: 0.85rem;
          color: #FAB826;
          font-weight: 600;
          margin: 0;
        }
        .legal-layout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 40px;
          align-items: start;
          margin-top: 40px;
        }
        .legal-toc {
          position: sticky;
          top: 96px;
          background: #FFFFFF;
          border: 1px solid #ECE6F1;
          border-radius: 18px;
          padding: 20px;
        }
        .legal-toc-title {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6B7280;
          margin: 0 0 12px;
        }
        .legal-toc ol {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .legal-toc ol a {
          display: block;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.88rem;
          color: #3B2A4A;
          text-decoration: none;
        }
        .legal-toc ol a:hover {
          background: #F3EDF8;
          color: #6C1E84;
        }
        .legal-toc-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #ECE6F1;
        }
        .legal-toc-links a {
          font-size: 0.86rem;
          font-weight: 700;
          color: #6C1E84;
          text-decoration: none;
        }
        .legal-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .legal-section {
          background: #FFFFFF;
          border: 1px solid #ECE6F1;
          border-radius: 18px;
          padding: 24px 28px;
          scroll-margin-top: 96px;
        }
        .legal-section h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #1E0426;
          margin: 0 0 10px;
        }
        .legal-section-number {
          display: inline-grid;
          place-items: center;
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #1E0426;
          color: #FAB826;
          font-size: 0.85rem;
        }
        .legal-section p {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.75;
          color: #4B4453;
        }
        .legal-contact {
          background: #1E0426;
          color: #FFFFFF;
          border-radius: 18px;
          padding: 26px 28px;
        }
        .legal-contact h2 {
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0 0 6px;
        }
        .legal-contact p {
          margin: 0 0 16px;
          color: rgba(255, 255, 255, 0.78);
        }
        .legal-contact-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .legal-contact-links a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #FFFFFF;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          overflow-wrap: anywhere;
          max-width: 100%;
        }
        .legal-contact-links a:last-child {
          background: #FAB826;
          border-color: #FAB826;
          color: #1E0426;
        }
        @media (max-width: 900px) {
          .legal-layout {
            grid-template-columns: 1fr;
            gap: 20px;
            margin-top: 24px;
          }
          .legal-toc {
            position: static;
          }
        }
        @media (max-width: 560px) {
          .legal-hero {
            padding: 104px 0 40px;
          }
          .legal-section,
          .legal-contact {
            padding: 20px 18px;
          }
          .legal-section h2 {
            font-size: 1.05rem;
          }
        }
      `}</style>
    </div>
  );
}
