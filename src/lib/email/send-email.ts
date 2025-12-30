/**
 * Email sending utility
 * 
 * Simple email sending using Resend API.
 * For production, add Resend to dependencies: npm install resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'My Family Butler <onboarding@resend.dev>';

interface SendEmailResult {
    success: boolean;
    error?: string;
}

/**
 * Send a magic link login email
 */
export async function sendLoginEmail(
    toEmail: string,
    magicLink: string
): Promise<SendEmailResult> {
    if (!RESEND_API_KEY) {
        console.error('[Email] RESEND_API_KEY not configured');
        return { success: false, error: 'Email not configured' };
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Link</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #10b981; margin: 0 0 24px 0; font-size: 24px;">🏠 My Family Butler</h1>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hallo! Klicke auf den Button unten, um dich in dein Dashboard einzuloggen:
    </p>
    
    <a href="${magicLink}" 
       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; 
              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
              margin: 8px 0 24px 0;">
      → Zum Dashboard
    </a>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
      Dieser Link ist 30 Minuten gültig.
    </p>
    
    <p style="color: #999; font-size: 12px; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #eee;">
      Falls du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.
    </p>
  </div>
</body>
</html>
  `.trim();

    const emailText = `
My Family Butler - Dashboard Login

Hallo! Klicke auf den Link unten, um dich einzuloggen:

${magicLink}

Dieser Link ist 30 Minuten gültig.

Falls du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.
  `.trim();

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [toEmail],
                subject: '🔑 Dein Login-Link für My Family Butler',
                html: emailHtml,
                text: emailText,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Email] Resend API error:', error);
            return { success: false, error: 'Failed to send email' };
        }

        console.log(`[Email] Login email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error('[Email] Error sending email:', error);
        return { success: false, error: 'Email service error' };
    }
}

/**
 * Send a family invite email
 */
export async function sendInviteEmail(
    toEmail: string,
    joinLink: string,
    inviterName?: string
): Promise<SendEmailResult> {
    if (!RESEND_API_KEY) {
        console.error('[Email] RESEND_API_KEY not configured');
        return { success: false, error: 'Email not configured' };
    }

    const inviterText = inviterName ? `${inviterName} has invited you` : 'You have been invited';
    // Use the same styles as the login email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Family Invite</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #10b981; margin: 0 0 24px 0; font-size: 24px;">🏠 My Family Butler</h1>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello! ${inviterText} to join their family on My Family Butler.
    </p>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Accept this invite to coordinate tasks, events, and shopping lists together!
    </p>
    
    <a href="${joinLink}" 
       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; 
              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
              margin: 8px 0 24px 0;">
      → Join Family
    </a>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
      If the button doesn't work, copy and paste this link:<br>
      ${joinLink}
    </p>
  </div>
</body>
</html>
  `.trim();

    const emailText = `
My Family Butler - Family Invitation

Hello! ${inviterText} to join their family on My Family Butler.

Click here to join:
${joinLink}
  `.trim();

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [toEmail],
                subject: '🏠 You have been invited to join a family',
                html: emailHtml,
                text: emailText,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Email] Resend API error:', error);
            const errorMessage = error.message || error.name || 'Failed to send email';
            return { success: false, error: errorMessage };
        }

        console.log(`[Email] Invite email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error('[Email] Error sending email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Email service error' };
    }
}

/**
 * Send a verification email
 */
export async function sendVerificationEmail(
    toEmail: string,
    verifyLink: string
): Promise<SendEmailResult> {
    if (!RESEND_API_KEY) {
        console.error('[Email] RESEND_API_KEY not configured');
        return { success: false, error: 'Email not configured' };
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #10b981; margin: 0 0 24px 0; font-size: 24px;">🏠 My Family Butler</h1>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello! Please verify your email address to secure your account.
    </p>
    
    <a href="${verifyLink}" 
       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; 
              text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
              margin: 8px 0 24px 0;">
      → Verify Email
    </a>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
      If the button doesn't work, copy and paste this link:<br>
      ${verifyLink}
    </p>

    <p style="color: #999; font-size: 12px; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #eee;">
      If you did not create an account, you can ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();

    const emailText = `
My Family Butler - Verify Email

Hello! Please verify your email address to secure your account.

Click here to verify:
${verifyLink}

If you did not create an account, you can ignore this email.
  `.trim();

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [toEmail],
                subject: '✅ Verify your email for My Family Butler',
                html: emailHtml,
                text: emailText,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Email] Resend API error:', error);
            const errorMessage = error.message || error.name || 'Failed to send email';
            return { success: false, error: errorMessage };
        }

        console.log(`[Email] Verification email sent to: ${toEmail}`);
        return { success: true };
    } catch (error) {
        console.error('[Email] Error sending email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Email service error' };
    }
}
