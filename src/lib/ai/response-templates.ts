/**
 * Bilingual Response Templates
 * 
 * Template strings for bot responses in German and English.
 * Used by message processor for confirmations, errors, and welcome messages.
 */

// ===========================================
// Language Detection
// ===========================================

/**
 * Simple language detection based on common words
 * Returns 'de' for German, 'en' for English
 */
export function detectLanguage(message: string): 'de' | 'en' {
    const text = message.toLowerCase();

    // German indicators (common words and patterns)
    const germanPatterns = [
        // Common German words
        /\b(und|oder|für|mit|bei|von|nach|zur|zum|auf|ein|eine|ich|du|wir|ist|sind|hat|haben)\b/,
        // German-specific characters
        /[äöüß]/,
        // Common German phrases
        /\b(guten tag|hallo|danke|bitte|morgen|termin|uhr)\b/,
        // Austrian school terms
        /\b(elternabend|elternsprechtag|schulautonom|wandertag|jause|turnen)\b/,
    ];

    // English indicators
    const englishPatterns = [
        /\b(the|and|or|for|with|at|from|to|on|a|an|i|you|we|is|are|has|have)\b/,
        /\b(hello|thanks|please|tomorrow|appointment|meeting|pm|am)\b/,
    ];

    // Count matches
    let germanScore = 0;
    let englishScore = 0;

    for (const pattern of germanPatterns) {
        if (pattern.test(text)) germanScore++;
    }

    for (const pattern of englishPatterns) {
        if (pattern.test(text)) englishScore++;
    }

    // Default to German for Austrian context
    return englishScore > germanScore ? 'en' : 'de';
}

// ===========================================
// Response Templates
// ===========================================

export interface ResponseTemplates {
    welcome: string;
    eventCreatedSingle: string;
    eventCreatedMultiple: string;
    reminderCreated: string;
    clarification: string;
    error: string;
    linkedToFamily: string;
    dashboardLink: string;
}

const templates: Record<'de' | 'en', ResponseTemplates> = {
    de: {
        welcome: `🎉 Willkommen bei My Family Butler!

Ich bin dein Familienkalender-Assistent.
Schick mir Termine, Erinnerungen, oder Fotos von Briefen!

📅 "Zahnarzt am Montag um 10"
⏰ "Erinnere mich morgen an..."
📸 Foto von Schulbrief senden

💡 Tippe "dashboard" für dein Online-Dashboard!`,

        eventCreatedSingle: `📅 Termin erstellt!

*{title}*{memberStr}
🗓️ {date}{timeStr}{locationStr}`,

        eventCreatedMultiple: `📅 {count} Termine erstellt!

{eventList}

✅ Alle Termine wurden in deinem Kalender gespeichert!`,

        reminderCreated: `✅ Erinnerung erstellt!

📋 *{task}*
📅 {datetime}`,

        clarification: `🤔 {question}`,

        error: `Entschuldigung, etwas ist schiefgelaufen. Bitte versuche es erneut.`,

        linkedToFamily: `🎉 Willkommen bei My Family Butler! Du wurdest zur Familie hinzugefügt. Schreib mir, um Termine und Erinnerungen zu erstellen!`,

        dashboardLink: `📊 Hier ist der Link zu deinem Dashboard: {url}`,
    },

    en: {
        welcome: `🎉 Welcome to My Family Butler!

I'm your family calendar assistant.
Send me appointments, reminders, or photos of letters!

📅 "Dentist on Monday at 10"
⏰ "Remind me tomorrow to..."
📸 Send a photo of a school letter

💡 Type "dashboard" for your online dashboard!`,

        eventCreatedSingle: `📅 Event created!

*{title}*{memberStr}
🗓️ {date}{timeStr}{locationStr}`,

        eventCreatedMultiple: `📅 {count} events created!

{eventList}

✅ All events have been saved to your calendar!`,

        reminderCreated: `✅ Reminder set!

📋 *{task}*
📅 {datetime}`,

        clarification: `🤔 {question}`,

        error: `Sorry, something went wrong. Please try again.`,

        linkedToFamily: `🎉 Welcome to My Family Butler! You've been added to the family. Send me a message to create appointments and reminders!`,

        dashboardLink: `📊 Here's the link to your dashboard: {url}`,
    },
};

// ===========================================
// Template Getters
// ===========================================

/**
 * Get a response template by key and language
 */
export function getTemplate(key: keyof ResponseTemplates, lang: 'de' | 'en'): string {
    return templates[lang][key];
}

/**
 * Get template with variable substitution
 */
export function formatTemplate(
    key: keyof ResponseTemplates,
    lang: 'de' | 'en',
    variables: Record<string, string | number>
): string {
    let template = getTemplate(key, lang);

    for (const [varName, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(value));
    }

    return template;
}

/**
 * Get localized date format based on language
 */
export function formatDateForLanguage(date: Date, lang: 'de' | 'en'): string {
    const locale = lang === 'de' ? 'de-AT' : 'en-US';
    return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

/**
 * Get localized datetime format based on language
 */
export function formatDateTimeForLanguage(date: Date, lang: 'de' | 'en'): string {
    const locale = lang === 'de' ? 'de-AT' : 'en-US';
    return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}
