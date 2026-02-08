'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  MessageCircle,
  Calendar,
  FileText,
  Shield,
  ArrowRight,
  Smartphone,
  Zap,
  Users,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmailLoginForm } from '@/components/landing/email-login-form';
import { APP_LINKS } from '@/lib/config';

const WHATSAPP_LINK = APP_LINKS.whatsappLink;
const TELEGRAM_LINK = APP_LINKS.telegramLink;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const pricingItems = [
    t('landing.pricing.list.item1'),
    t('landing.pricing.list.item2'),
    t('landing.pricing.list.item3'),
    t('landing.pricing.list.item4'),
    t('landing.pricing.list.item5'),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-background to-teal-50/80 dark:from-background dark:via-background dark:to-muted/30">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.privacy')}
            </Link>
            <Link href="/terms" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.terms')}
            </Link>
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground px-4 py-2.5 font-medium transition-colors"
            >
              {t('landing.nav.dashboardLogin')}
            </Link>
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            {t('landing.hero.badge')}
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            {t('landing.hero.titleLine1')}
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('landing.hero.titleLine2')}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.subheadlinePre')}
            <strong> {t('landing.hero.subheadlineStrong')}</strong>{' '}
            {t('landing.hero.subheadlinePost')}
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="sm:hidden flex flex-col gap-4 mb-8">
              <a
                href={WHATSAPP_LINK}
                className="group flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
              >
                <WhatsAppIcon className="w-6 h-6" />
                {t('landing.mobile.startWhatsApp')}
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href={TELEGRAM_LINK}
                className="group flex items-center justify-center gap-3 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/15 px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
              >
                <TelegramIcon className="w-5 h-5" />
                {t('landing.mobile.startTelegram')}
              </a>
            </div>

            <div className="hidden sm:flex flex-col lg:flex-row items-center justify-center gap-8 mb-8">
              <div className="bg-card/90 rounded-3xl p-8 shadow-lg border border-border backdrop-blur-sm">
                <p className="text-muted-foreground font-medium mb-4">{t('landing.qr.scan')}</p>
                <div className="bg-background p-4 rounded-2xl inline-block">
                  <QRCodeSVG value={WHATSAPP_LINK} size={160} level="M" marginSize={0} className="rounded-lg" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">{t('landing.qr.opensWhatsApp')}</p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm mb-2">{t('landing.qr.clickDirect')}</p>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  WhatsApp
                </a>
                <a
                  href={TELEGRAM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/15 px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  <TelegramIcon className="w-5 h-5" />
                  Telegram
                </a>
              </div>
            </div>

            <div className="hidden sm:block mt-12 pt-8 border-t border-border">
              <p className="text-muted-foreground text-sm mb-4">{t('landing.returningUsers')}</p>
              <EmailLoginForm />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              {t('landing.trust.ready')}
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              {t('landing.trust.gdpr')}
            </span>
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              {t('landing.trust.noApp')}
            </span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24 bg-background/40 backdrop-blur-sm">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t('landing.how.title')}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('landing.how.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('landing.how.steps.step1.title')}</h3>
            <p className="text-muted-foreground">{t('landing.how.steps.step1.description')}</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('landing.how.steps.step2.title')}</h3>
            <p className="text-muted-foreground">{t('landing.how.steps.step2.description')}</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('landing.how.steps.step3.title')}</h3>
            <p className="text-muted-foreground">{t('landing.how.steps.step3.description')}</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">✨</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('landing.how.steps.step4.title')}</h3>
            <p className="text-muted-foreground">{t('landing.how.steps.step4.description')}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t('landing.features.title')}</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-border">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/15 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7 text-emerald-600 dark:text-emerald-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.features.cards.card1.title')}</h3>
            <p className="text-muted-foreground leading-relaxed">{t('landing.features.cards.card1.description')}</p>
          </div>

          <div className="bg-card rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-border">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/15 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.features.cards.card2.title')}</h3>
            <p className="text-muted-foreground leading-relaxed">{t('landing.features.cards.card2.description')}</p>
          </div>

          <div className="bg-card rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-border">
            <div className="w-14 h-14 bg-violet-100 dark:bg-violet-500/15 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-violet-600 dark:text-violet-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">{t('landing.features.cards.card3.title')}</h3>
            <p className="text-muted-foreground leading-relaxed">{t('landing.features.cards.card3.description')}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24">
        <div className="max-w-lg mx-auto bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-10 text-center text-white shadow-2xl shadow-emerald-200">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            {t('landing.pricing.badge')}
          </div>
          <div className="mb-6">
            <span className="text-5xl font-bold">{t('landing.pricing.amount')}</span>
            <span className="text-emerald-100">{t('landing.pricing.perMonth')}</span>
          </div>
          <ul className="text-left space-y-3 mb-8">
            {pricingItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-300" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-emerald-50 dark:bg-background dark:text-emerald-400 dark:hover:bg-muted transition-colors"
          >
            {t('landing.pricing.cta')}
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-emerald-100 text-sm mt-4">{t('landing.pricing.footnote')}</p>
        </div>
      </section>

      <footer className="container mx-auto px-6 py-12 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t('landing.footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t('landing.footer.terms')}
            </Link>
            <Link href="/login" className="hover:text-primary transition-colors">
              {t('landing.footer.dashboardLogin')}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">{t('landing.footer.copyright', { year: currentYear })}</p>
        </div>
      </footer>
    </div>
  );
}
