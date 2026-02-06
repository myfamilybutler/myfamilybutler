import { describe, expect, it } from 'vitest';
import { resolveConfirmationIntent } from './confirmation-resolver';

const draft = {
  title: 'Training (Undram)',
  event_date: '2026-02-09',
  event_time: '15:00',
  is_all_day: false,
  family_member: 'Undram',
  location: null,
};

describe('resolveConfirmationIntent', () => {
  it('maps button-style confirm id directly', async () => {
    const result = await resolveConfirmationIntent('confirm', draft);
    expect(result.intent).toBe('confirm');
  });

  it('maps button-style discard id directly', async () => {
    const result = await resolveConfirmationIntent('discard', draft);
    expect(result.intent).toBe('reject');
  });

  it('handles short telegram-style yes/no replies', async () => {
    const yes = await resolveConfirmationIntent('ja', draft);
    const no = await resolveConfirmationIntent('no', draft);

    expect(yes.intent).toBe('confirm');
    expect(no.intent).toBe('reject');
  });
});
