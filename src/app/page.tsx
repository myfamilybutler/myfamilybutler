import Link from 'next/link';
import { MessageCircle, Calendar, FileText, Shield, ArrowRight, LogIn } from 'lucide-react';

export default function LandingPage() {
  // Placeholder - will be replaced with actual WhatsApp number
  const WHATSAPP_NUMBER = '436601234567';
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FamilyButler</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2.5 font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full font-medium transition-all hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Jetzt verfügbar auf WhatsApp
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Your Family Butler.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              On WhatsApp.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Der smarte AI-Assistent, der Ihre Familie organisiert. 
            Termine, Erinnerungen, Schulbriefe – alles einfach per Chat.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-200"
            >
              <LogIn className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Try via WhatsApp
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Free to try • No app download needed
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Erinnert an alles
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Termine, Geburtstage, Müllabfuhr – Ihr Butler vergisst nichts und 
              erinnert Sie rechtzeitig per WhatsApp.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Liest Schulbriefe
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Schicken Sie einfach ein Foto – Ihr Butler fasst die wichtigsten 
              Infos zusammen und merkt sich Termine.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-violet-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Österreichischer Datenschutz
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Ihre Daten bleiben in Europa. DSGVO-konform und sicher 
              verschlüsselt.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            So einfach funktioniert&apos;s
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Kein Download, keine App, keine Registrierung – einfach chatten.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chat öffnen
            </h3>
            <p className="text-gray-600">
              Klicken Sie auf &ldquo;Chat starten&rdquo; und schreiben Sie uns auf WhatsApp.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              2
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Anfrage schicken
            </h3>
            <p className="text-gray-600">
              Schreiben Sie einfach, was Sie brauchen – oder schicken Sie ein Foto.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
              3
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Zurücklehnen
            </h3>
            <p className="text-gray-600">
              Ihr Butler kümmert sich um den Rest und erinnert Sie rechtzeitig.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-lg mx-auto bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-10 text-center text-white shadow-2xl shadow-emerald-200">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            Einführungspreis
          </div>
          <div className="mb-6">
            <span className="text-5xl font-bold">€4,99</span>
            <span className="text-emerald-100">/Monat</span>
          </div>
          <ul className="text-left space-y-3 mb-8">
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unbegrenzte Nachrichten
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Erinnerungen & Termine
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Bild- & Dokumentenanalyse
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Jederzeit kündbar
            </li>
          </ul>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-emerald-50 transition-colors"
          >
            Kostenlos testen
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-emerald-100 text-sm mt-4">
            7 Tage kostenlos • Keine Kreditkarte nötig
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">FamilyButler</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="/privacy" className="hover:text-emerald-600 transition-colors">Datenschutz</a>
            <a href="/terms" className="hover:text-emerald-600 transition-colors">AGB</a>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} FamilyButler. Made in Austria 🇦🇹
          </p>
        </div>
      </footer>
    </div>
  );
}
