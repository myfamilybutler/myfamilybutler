import Link from 'next/link';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            ← Zurück zur Startseite
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Datenschutzerklärung</h1>
          <p className="text-muted-foreground mb-8">Letzte Aktualisierung: {new Date().toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="space-y-8 text-foreground leading-relaxed">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Verantwortlicher</h2>
              <p>
                Verantwortlich für die Datenverarbeitung auf dieser Website ist:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">MyFamilyButler</p>
                <p>Khongorzul Gantulga</p>
                <p>Madleinweg 3</p>
                <p>6065 Thaur, Österreich</p>
                <p className="mt-2">E-Mail: info@myfamilybutler.com</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Erhobene Daten</h2>
              <p className="mb-4">
                Wir erheben und verarbeiten folgende Daten, wenn Sie unseren WhatsApp-basierten Service nutzen:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>WhatsApp-Telefonnummer:</strong> Zur Identifikation und Kommunikation
                </li>
                <li>
                  <strong>Nachrichteninhalte:</strong> Ihre an den Bot gesendeten Nachrichten und unsere Antworten
                </li>
                <li>
                  <strong>Erinnerungen und Termine:</strong> Von Ihnen erstellte Aufgaben, Termine und Erinnerungen
                </li>
                <li>
                  <strong>Bilder und Dokumente:</strong> Von Ihnen hochgeladene Dateien (z.B. Schulbriefe, Rechnungen)
                </li>
                <li>
                  <strong>Nutzungsdaten:</strong> Zeitpunkt der Nutzung, Interaktionshäufigkeit
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Zweck der Datenverarbeitung</h2>
              <p className="mb-4">Wir verarbeiten Ihre Daten ausschließlich für folgende Zwecke:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Bereitstellung unseres KI-gestützten Assistenten-Services</li>
                <li>Erstellung und Verwaltung von Erinnerungen und Terminen</li>
                <li>Analyse und Zusammenfassung hochgeladener Dokumente</li>
                <li>Verbesserung der Service-Qualität</li>
                <li>Technischer Support und Fehlerbehebung</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Rechtsgrundlage</h2>
              <p>
                Die Verarbeitung Ihrer Daten erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) 
                und zur Erfüllung des Vertrages zwischen Ihnen und uns (Art. 6 Abs. 1 lit. b DSGVO).
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Datenweitergabe und Drittanbieter</h2>
              <p className="mb-4">Wir nutzen folgende Drittanbieter zur Bereitstellung unseres Services:</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Supabase (Datenspeicherung)</h3>
                  <p className="text-sm mb-1">Anbieter: Supabase Inc., USA</p>
                  <p className="text-sm mb-1">Zweck: Speicherung Ihrer Nachrichten, Erinnerungen und Daten</p>
                  <p className="text-sm">Standort: Server in Europa (EU)</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">OpenAI (KI-Verarbeitung)</h3>
                  <p className="text-sm mb-1">Anbieter: OpenAI, L.L.C., USA</p>
                  <p className="text-sm mb-1">Zweck: KI-gestützte Antworten, Dokumentenanalyse</p>
                  <p className="text-sm">Datenschutz: <a href="https://openai.com/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener">openai.com/privacy</a></p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Meta WhatsApp Business API</h3>
                  <p className="text-sm mb-1">Anbieter: Meta Platforms Ireland Limited</p>
                  <p className="text-sm mb-1">Zweck: Nachrichtenübermittlung</p>
                  <p className="text-sm">Datenschutz: <a href="https://www.whatsapp.com/legal/privacy-policy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener">WhatsApp Privacy Policy</a></p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Speicherdauer</h2>
              <p>
                Wir speichern Ihre Daten nur so lange, wie es für die Bereitstellung unserer Dienste erforderlich 
                ist oder Sie Kunde bei uns sind. Nach Beendigung des Services oder auf Ihren Wunsch hin werden 
                Ihre Daten innerhalb von 30 Tagen gelöscht.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Ihre Rechte</h2>
              <p className="mb-4">Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Auskunftsrecht:</strong> Sie können Auskunft über Ihre gespeicherten Daten verlangen</li>
                <li><strong>Berichtigungsrecht:</strong> Sie können die Korrektur falscher Daten verlangen</li>
                <li><strong>Löschungsrecht:</strong> Sie können die Löschung Ihrer Daten verlangen</li>
                <li><strong>Widerspruchsrecht:</strong> Sie können der Datenverarbeitung widersprechen</li>
                <li><strong>Datenübertragbarkeit:</strong> Sie können Ihre Daten in einem gängigen Format erhalten</li>
                <li><strong>Widerruf der Einwilligung:</strong> Sie können Ihre Einwilligung jederzeit widerrufen</li>
              </ul>
              <p className="mt-4">
                Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter: <a href="mailto:info@myfamilybutler.com" className="text-emerald-600 hover:underline">info@myfamilybutler.com</a>
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Datensicherheit</h2>
              <p>
                Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen 
                unbeabsichtigte oder unrechtmäßige Löschung, Veränderung oder gegen Verlust und gegen 
                unbefugte Weitergabe oder unbefugten Zugriff zu schützen. Alle Datenübertragungen erfolgen 
                verschlüsselt über HTTPS.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Beschwerderecht</h2>
              <p>
                Sie haben das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Österreichische Datenschutzbehörde</p>
                <p>Barichgasse 40-42</p>
                <p>1030 Wien</p>
                <p className="mt-2">Website: <a href="https://www.dsb.gv.at" className="text-emerald-600 hover:underline" target="_blank" rel="noopener">dsb.gv.at</a></p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Änderungen der Datenschutzerklärung</h2>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen 
                oder Änderungen unserer Services anzupassen. Die aktuelle Version finden Sie stets auf dieser Seite.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
