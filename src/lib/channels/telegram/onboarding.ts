import { removeKeyboard } from './send';

export async function handleTelegramPhoneReceived(
  chatId: number,
  firstName: string
): Promise<void> {
  await removeKeyboard(
    chatId,
    `✅ Danke, ${firstName}! Deine Nummer wurde gespeichert. Du kannst mir jetzt Nachrichten schicken, um Termine und Erinnerungen zu erstellen! 📅`
  );
}
