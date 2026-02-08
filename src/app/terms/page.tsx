import Link from 'next/link';

export default function Terms() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-background to-teal-50/80 dark:from-background dark:via-background dark:to-muted/30">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Zurück zur Startseite
          </Link>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Allgemeine Geschäftsbedingungen (AGB)</h1>
          <p className="text-muted-foreground mb-8">Letzte Aktualisierung: {new Date().toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="space-y-8 text-foreground leading-relaxed">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Geltungsbereich</h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Leistungen von MyFamilyButler, 
                bereitgestellt durch:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium">MyFamilyButler</p>
                <p>Khongorzul Gantulga</p>
                <p>Madleinweg 3</p>
                <p>6065 Thaur, Österreich</p>
                <p className="mt-2">E-Mail: info@myfamilybutler.com</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Leistungsbeschreibung</h2>
              <p className="mb-4">
                MyFamilyButler ist ein KI-gestützter Assistenten-Service, der über WhatsApp bereitgestellt wird. 
                Unsere Dienstleistungen umfassen:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>KI-gestützte Konversation und Unterstützung im Familienalltag</li>
                <li>Erstellung und Verwaltung von Erinnerungen und Terminen</li>
                <li>Analyse und Zusammenfassung von Dokumenten (z.B. Schulbriefe, Rechnungen)</li>
                <li>Beantwortung von Fragen zu österreichischen Services und Regularien</li>
                <li>Koordinierung von Familienaufgaben</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Vertragsschluss</h2>
              <p>
                Der Vertrag kommt zustande, wenn Sie eine Nachricht an unsere WhatsApp-Nummer senden und 
                damit unseren Service nutzen. Durch die erste Nutzung akzeptieren Sie diese AGB.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Preise und Zahlungsbedingungen</h2>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-lg mb-4">
                <p className="font-semibold text-lg mb-2">Kostenloses Testangebot</p>
                <p>Aktuell bieten wir unseren Service <strong>7 Tage kostenlos</strong> zur Testnutzung an.</p>
              </div>
              <p className="mb-4">Nach der Testphase:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Monatlicher Preis:</strong> €4,99 pro Monat</li>
                <li><strong>Zahlungsweise:</strong> Monatlich im Voraus</li>
                <li><strong>Akzeptierte Zahlungsmethoden:</strong> Kreditkarte, PayPal, Banküberweisung</li>
                <li><strong>Rechnungsstellung:</strong> Monatlich per E-Mail</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Laufzeit und Kündigung</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Der Vertrag läuft auf unbestimmte Zeit</li>
                <li>Sie können jederzeit mit einer Frist von 7 Tagen zum Monatsende kündigen</li>
                <li>Die Kündigung erfolgt per E-Mail an: info@myfamilybutler.com</li>
                <li>Nach Vertragsende werden Ihre Daten gemäß unserer Datenschutzerklärung gelöscht</li>
                <li>Eine bereits bezahlte Monatsgebühr wird anteilig nicht erstattet</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Pflichten des Nutzers</h2>
              <p className="mb-4">Als Nutzer verpflichten Sie sich:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Den Service nur für rechtmäßige Zwecke zu nutzen</li>
                <li>Keine beleidigenden, diskriminierenden oder gesetzwidrigen Inhalte zu versenden</li>
                <li>Keine Spam-Nachrichten oder missbräuchliche Anfragen zu senden</li>
                <li>Die Zugangsdaten nicht an Dritte weiterzugeben</li>
                <li>Wahrheitsgemäße Angaben zu machen</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Verfügbarkeit und Gewährleistung</h2>
              <p className="mb-4">
                Wir bemühen uns um eine möglichst hohe Verfügbarkeit unseres Services. Allerdings können wir 
                eine ununterbrochene Verfügbarkeit nicht garantieren.
              </p>
              <p className="mb-4">
                <strong>Ausschluss:</strong> Keine Gewährleistung besteht bei:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Wartungsarbeiten (werden im Voraus angekündigt)</li>
                <li>Störungen bei Drittanbietern (WhatsApp, OpenAI, Hosting-Provider)</li>
                <li>Höherer Gewalt</li>
                <li>Fehlerhaften Inhalten durch KI-Verarbeitung</li>
              </ul>
              <p className="mt-4">
                <strong>Wichtig:</strong> Die KI-generierten Antworten dienen als Unterstützung und ersetzen 
                keine professionelle Beratung (rechtlich, medizinisch, finanziell).
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Haftung</h2>
              <p className="mb-4">
                Wir haften für Schäden nur bei Vorsatz und grober Fahrlässigkeit. Die Haftung bei leichter 
                Fahrlässigkeit ist ausgeschlossen, soweit nicht wesentliche Vertragspflichten verletzt werden.
              </p>
              <p className="mb-4">
                <strong>Ausgeschlossen ist insbesondere die Haftung für:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Falsche oder unvollständige KI-Antworten</li>
                <li>Verpasste Erinnerungen aufgrund technischer Störungen</li>
                <li>Datenverlust bei Drittanbietern</li>
                <li>Indirekte Schäden oder entgangenen Gewinn</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Die Haftung für Personenschäden bleibt hiervon unberührt.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Datenschutz</h2>
              <p>
                Für die Verarbeitung Ihrer personenbezogenen Daten gelten unsere{' '}
                <Link href="/privacy" className="text-emerald-600 hover:underline font-medium">
                  Datenschutzbestimmungen
                </Link>.
                Diese sind Bestandteil dieser AGB.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Widerrufsrecht</h2>
              <p className="mb-4">
                Als Verbraucher haben Sie ein 14-tägiges Widerrufsrecht. Sie können Ihre Vertragserklärung 
                innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen.
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Widerruf per E-Mail an:</p>
                <p>info@myfamilybutler.com</p>
                <p className="mt-2 text-sm">
                  Betreff: &quot;Widerruf MyFamilyButler&quot;
                </p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Bei Nutzung während der Widerrufsfrist haben Sie ggf. Wertersatz für bereits genutzte 
                Leistungen zu zahlen.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Änderungen der AGB</h2>
              <p>
                Wir behalten uns vor, diese AGB bei Bedarf zu ändern. Änderungen werden Ihnen mindestens 
                4 Wochen vor Inkrafttreten per E-Mail mitgeteilt. Widersprechen Sie nicht innerhalb von 
                4 Wochen, gelten die geänderten AGB als akzeptiert.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Schlussbestimmungen</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Anwendbares Recht:</strong> Es gilt österreichisches Recht unter Ausschluss des 
                  UN-Kaufrechts
                </li>
                <li>
                  <strong>Gerichtsstand:</strong> Für Streitigkeiten ist das sachlich zuständige Gericht in 
                  Innsbruck zuständig
                </li>
                <li>
                  <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen unwirksam sein, 
                  bleibt die Wirksamkeit der übrigen Bestimmungen unberührt
                </li>
              </ul>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Streitbeilegung</h2>
              <p>
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  className="text-emerald-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ec.europa.eu/consumers/odr
                </a>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
