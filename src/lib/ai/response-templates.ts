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
    welcomeReturning: string;
    welcomeInactive: string;
    eventCreatedSingle: string;
    eventCreatedMultiple: string;
    reminderCreated: string;
    clarification: string;
    error: string;
    linkedToFamily: string;
    dashboardLink: string;
    // New keys
    undoSuccess: string;
    eventConfirmed: string;
    draftDiscarded: string;
    noActionPending: string;
    unknownCommand: string;
    help: string;
    startWelcome: string;
    dashboardLinkInstruction: string;
    dashboardLinkError: string;
    notInHousehold: string;
    saveError: string;
    draftHeader: string;
    isThisCorrect: string;
    saveDraftError: string;
    identityError: string;
    rateLimitReached: string;
    genericProcessingError: string;
    draftNotFound: string;
    draftNotMatched: string;
    draftExpired: string;
    multipleDraftsNeedDay: string;
    eventSavedWithReminder: string;
    eventsSavedWithReminders: string;
    saveEventError: string;
    fileProcessingError: string;
    visionEventSaved: string;
    visionEventsSaved: string;
    eventSavedDetails: string;
    eventsSavedCount: string;
    openDashboard: string;
    // Meal Planner
    mealNoHousehold: string;
    mealNoToday: string;
    mealTodayHeading: string;
    mealNoWeek: string;
    mealWeekHeading: string;
    mealPlannerHelp: string;
}

const templates: Record<'de' | 'en', ResponseTemplates> = {
    de: {
        welcome: `👋 Hallo! Schick mir einfach deinen Termin:
"Zahnarzt Montag 10"

Das ist alles! 😊`,

        welcomeReturning: `Schön, dass du wieder da bist! 🎉 Was kann ich für dich tun?`,

        welcomeInactive: `Lange nichts gehört! 👋 Wie kann ich dir helfen?`,

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

        undoSuccess: `Termin wurde rückgängig gemacht.`,
        
        eventConfirmed: `Termin "{title}" wurde gespeichert!`,
        
        draftDiscarded: `Alles klar, Termin wurde verworfen. Was möchtest du stattdessen eintragen?`,
        
        noActionPending: `Es gibt gerade nichts zu bestätigen oder rückgängig zu machen.`,
        
        unknownCommand: `Unbekannter Befehl. Tippe "help" für Hilfe.`,
        
        help: `*My Family Butler Hilfe*

*Termine:*
- "Zahnarzt am Montag um 10 Uhr"
- "Meeting morgen 14:00"

*Erinnerungen:*
- "Erinnere mich in 1 Stunde an..."
- "Reminder: Milch kaufen morgen"

*Befehle:*
- dashboard - Dashboard öffnen
- help - Diese Hilfe anzeigen`,

        startWelcome: `Willkommen bei My Family Butler!

Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:

- Termine erstellen - "Zahnarzt am Montag um 10 Uhr"
- Erinnerungen - "Erinnere mich morgen an Milch kaufen"
- Dashboard öffnen - "Dashboard" oder "Link"

Probiere es aus! Schreib mir einfach eine Nachricht.`,

        dashboardLinkInstruction: `Hier ist dein Dashboard-Link. Der Link ist 15 Minuten gültig.`,
        
        dashboardLinkError: `Es gab ein Problem beim Erstellen des Dashboard-Links. Bitte versuche es erneut.`,
        
        notInHousehold: `Du bist noch keinem Haushalt zugeordnet. Bitte lass dich einladen.`,
        
        saveError: `Es gab einen Fehler beim Speichern des Termins.`,
        
        draftHeader: `*Entwurf*`,
        
        isThisCorrect: `Stimmt das?`,
        
        saveDraftError: `Es gab einen Fehler beim Erstellen des Entwurfs.`,
        
        identityError: `Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es später erneut.`,
        
        rateLimitReached: `Du sendest Nachrichten zu schnell. Bitte warte einen Moment.`,

        genericProcessingError: `Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuche es erneut.`,

        draftNotFound: `Entschuldigung, der Entwurf konnte nicht gefunden werden. Bitte erstelle den Termin erneut.`,
        draftNotMatched: `Entschuldigung, ich konnte den Entwurf nicht zuordnen. Bitte erstelle den Termin erneut.`,
        draftExpired: `Der Entwurf wurde nicht mehr gefunden. Bitte erstelle den Termin erneut.`,
        multipleDraftsNeedDay: `Ich habe mehrere Termine im Entwurf. Für welchen Tag soll ich das ändern?`,
        eventSavedWithReminder: `Termin "{title}" wurde gespeichert!\n\n⏰ Ich erinnere dich 30 Minuten vorher.`,
        eventsSavedWithReminders: `{count} Termine wurden gespeichert!\n\n⏰ Erinnerungen wurden für alle Termine mit Uhrzeit erstellt.`,
        saveEventError: `Entschuldigung, beim Speichern ist ein Fehler aufgetreten.`,
        fileProcessingError: `Entschuldigung, ich konnte die Datei nicht verarbeiten.`,
        visionEventSaved: `Termin erkannt und gespeichert:\n"{title}"`,
        visionEventsSaved: `{count} Termine erkannt und gespeichert!`,
        eventSavedDetails: `Termin gespeichert:\n\n"{title}"{memberStr}\n{formattedDate}{timeStr}{reminderStr}`,
        eventsSavedCount: `{count} Termine gespeichert!`,
        openDashboard: `Dashboard öffnen`,

        mealNoHousehold: `Du bist noch keinem Haushalt zugeordnet.`,
        mealNoToday: `Für heute ist noch nichts geplant. Was möchtest du essen?`,
        mealTodayHeading: `Heute auf dem Plan:`,
        mealNoWeek: `Für diese Woche ist noch nichts geplant.\n\nSchreib z.B. "Mittagessen Montag: Pasta"`,
        mealWeekHeading: `*Essensplan diese Woche:*`,
        mealPlannerHelp: `Mahlzeitenplanung ist aktiviert!

Sage mir z.B.:
- "Was gibt es heute zum Abendessen?"
- "Mittagessen Montag: Spaghetti"
- "Zeig mir den Essensplan"`,
    },

    en: {
        welcome: `👋 Hi! Just send me your appointment:
"Dentist Monday 10am"

That's all! 😊`,

        welcomeReturning: `Great to have you back! 🎉 What can I do for you?`,

        welcomeInactive: `Long time no see! 👋 How can I help you?`,

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

        undoSuccess: `Event was undone.`,
        
        eventConfirmed: `Event "{title}" saved!`,
        
        draftDiscarded: `Alright, draft discarded. What would you like to enter instead?`,
        
        noActionPending: `There is nothing to confirm or undo at the moment.`,
        
        unknownCommand: `Unknown command. Type "help" for help.`,
        
        help: `*My Family Butler Help*

*Events:*
- "Dentist on Monday at 10 am"
- "Meeting tomorrow 14:00"

*Reminders:*
- "Remind me in 1 hour about..."
- "Reminder: Buy milk tomorrow"

*Commands:*
- dashboard - Open dashboard
- help - Show this help`,

        startWelcome: `Welcome to My Family Butler!

I'm your personal family assistant. I can help you with:

- Create appointments - "Dentist on Monday at 10 am"
- Reminders - "Remind me tomorrow to buy milk"
- Open Dashboard - "Dashboard" or "Link"

Give it a try! Just send me a message.`,

        dashboardLinkInstruction: `Here is your dashboard link. The link is valid for 15 minutes.`,
        
        dashboardLinkError: `There was a problem creating the dashboard link. Please try again.`,
        
        notInHousehold: `You are not part of a household yet. Please get invited.`,
        
        saveError: `There was an error saving the event.`,
        
        draftHeader: `*Draft*`,
        
        isThisCorrect: `Is this correct?`,
        
        saveDraftError: `There was an error creating the draft.`,
        
        identityError: `Sorry, there was an error. Please try again later.`,
        
        rateLimitReached: `You are sending messages too fast. Please wait a moment.`,

        genericProcessingError: `I'm sorry, an error occurred. Please try again.`,

        draftNotFound: `Sorry, the draft could not be found. Please create the event again.`,
        draftNotMatched: `Sorry, I could not match the draft. Please create the event again.`,
        draftExpired: `The draft was no longer found. Please create the event again.`,
        multipleDraftsNeedDay: `I have several events in the draft. Which day should I change?`,
        eventSavedWithReminder: `Event "{title}" saved!\n\n⏰ I'll remind you 30 minutes before.`,
        eventsSavedWithReminders: `{count} events saved!\n\n⏰ Reminders created for all events with a time.`,
        saveEventError: `Sorry, an error occurred while saving.`,
        fileProcessingError: `Sorry, I could not process the file.`,
        visionEventSaved: `Event recognized and saved:\n"{title}"`,
        visionEventsSaved: `{count} events recognized and saved!`,
        eventSavedDetails: `Event saved:\n\n"{title}"{memberStr}\n{formattedDate}{timeStr}{reminderStr}`,
        eventsSavedCount: `{count} events saved!`,
        openDashboard: `Open dashboard`,

        mealNoHousehold: `You are not part of a household yet.`,
        mealNoToday: `Nothing planned for today. What would you like to eat?`,
        mealTodayHeading: `On the menu today:`,
        mealNoWeek: `Nothing planned for this week.\n\nTry "Lunch Monday: Pasta"`,
        mealWeekHeading: `*Meal plan this week:*`,
        mealPlannerHelp: `Meal planning activated!

Try:
- "What's for dinner today?"
- "Lunch Monday: Spaghetti"
- "Show me the meal plan"`,
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
