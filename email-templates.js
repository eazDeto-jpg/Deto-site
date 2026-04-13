/**
 * Email Templates for Brevo Integration
 * Provides HTML and text versions of all emails
 */

/**
 * Booking Confirmation Email
 */
export function getBookingConfirmationEmail(booking, customer) {
  const date = new Date(booking.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const priceMap = {
    'Exterieur': 35,
    'Interieur': 45,
    'Volledig': 75
  };

  let price = priceMap[booking.dienst] || 0;
  if (booking.vuil_toeslag) {
    price += booking.vuil_toeslag;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .price { font-size: 24px; color: #667eea; font-weight: bold; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Deto — Boeking Bevestigd</h1>
        </div>
        <div class="content">
          <p>Hallo ${customer.full_name},</p>
          <p>Je boeking is succesvol geplaatst! Hieronder vind je de details van je afspraak.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Boeking ID:</span>
              <span class="value">#${booking.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Datum & Tijd:</span>
              <span class="value">${date}</span>
            </div>
            <div class="detail-row">
              <span class="label">Dienst:</span>
              <span class="value">${booking.dienst}</span>
            </div>
            <div class="detail-row">
              <span class="label">Voertuig:</span>
              <span class="value">${booking.voertuig}</span>
            </div>
            <div class="detail-row">
              <span class="label">Locatie:</span>
              <span class="value">Gent (gratis verplaatsing)</span>
            </div>
            <div class="detail-row">
              <span class="label">Totaalbedrag:</span>
              <span class="price">€${(price / 100).toFixed(2)}</span>
            </div>
          </div>

          <h3>Volgende stappen:</h3>
          <ul>
            <li>Je ontvangt een herinnering 24 uur voor je afspraak</li>
            <li>Een detailer zal je bellen om de exacte tijd in te plannen</li>
            <li>Betaling gebeurt na de dienst via de app</li>
          </ul>

          <p>Heb je vragen? Neem contact op via <a href="mailto:info@deto.be">info@deto.be</a> of WhatsApp.</p>

          <a href="https://deto.site/profiel.html" class="button">Bekijk je boeking</a>

          <div class="footer">
            <p>© 2026 Deto. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Deto — Boeking Bevestigd

Hallo ${customer.full_name},

Je boeking is succesvol geplaatst! Hieronder vind je de details van je afspraak.

BOEKING DETAILS
Boeking ID: #${booking.id.substring(0, 8).toUpperCase()}
Datum & Tijd: ${date}
Dienst: ${booking.dienst}
Voertuig: ${booking.voertuig}
Locatie: Gent (gratis verplaatsing)
Totaalbedrag: €${(price / 100).toFixed(2)}

VOLGENDE STAPPEN
- Je ontvangt een herinnering 24 uur voor je afspraak
- Een detailer zal je bellen om de exacte tijd in te plannen
- Betaling gebeurt na de dienst via de app

Heb je vragen? Neem contact op via info@deto.be of WhatsApp.

Bekijk je boeking: https://deto.site/profiel.html

© 2026 Deto. Alle rechten voorbehouden.
  `;

  return { html, text, subject: 'Deto — Boeking Bevestigd' };
}

/**
 * Booking Reminder Email (24 hours before)
 */
export function getBookingReminderEmail(booking, customer) {
  const date = new Date(booking.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ffd93d; color: #333; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⏰ Herinnering: Je afspraak is morgen!</h2>
        </div>
        <div class="content">
          <p>Hallo ${customer.full_name},</p>
          <p>Dit is een vriendelijke herinnering dat je boeking morgen plaatsvindt:</p>
          <p><strong>${date}</strong></p>
          <p>Zorg ervoor dat je thuis bent en dat je auto bereikbaar is.</p>
          <p>Veel plezier met je Deto-ervaring!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Herinnering: Je afspraak is morgen!

Hallo ${customer.full_name},

Dit is een vriendelijke herinnering dat je boeking morgen plaatsvindt:
${date}

Zorg ervoor dat je thuis bent en dat je auto bereikbaar is.
Veel plezier met je Deto-ervaring!
  `;

  return { html, text, subject: 'Herinnering: Je Deto-afspraak is morgen!' };
}

/**
 * Booking Completion Email
 */
export function getBookingCompletionEmail(booking, customer, detailer) {
  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6bcf7f; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
        .rating-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✓ Je auto is klaar!</h2>
        </div>
        <div class="content">
          <p>Hallo ${customer.full_name},</p>
          <p>Je auto is net afgerond door ${detailer.naam}. Je auto ziet er fantastisch uit!</p>
          
          <div class="rating-box">
            <h3>Hoe was je ervaring?</h3>
            <p>We zouden graag je mening horen. Beoordeel je detailer en deel je feedback.</p>
            <a href="https://deto.site/profiel.html" class="button">Beoordeel nu</a>
          </div>

          <p>Bedankt dat je voor Deto hebt gekozen!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Je auto is klaar!

Hallo ${customer.full_name},

Je auto is net afgerond door ${detailer.naam}. Je auto ziet er fantastisch uit!

Hoe was je ervaring?
We zouden graag je mening horen. Beoordeel je detailer en deel je feedback.

Beoordeel nu: https://deto.site/profiel.html

Bedankt dat je voor Deto hebt gekozen!
  `;

  return { html, text, subject: 'Je Deto-afspraak is voltooid!' };
}

/**
 * Password Reset Email
 */
export function getPasswordResetEmail(customer, resetLink) {
  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
        .warning { background: #fee; color: #c33; padding: 10px; border-radius: 4px; margin-top: 15px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Wachtwoord Resetten</h2>
        </div>
        <div class="content">
          <p>Hallo ${customer.full_name},</p>
          <p>Je hebt een verzoek ingediend om je wachtwoord opnieuw in te stellen.</p>
          <p>Klik op de onderstaande knop om je wachtwoord te wijzigen:</p>
          
          <a href="${resetLink}" class="button">Wachtwoord Resetten</a>

          <p>Deze link is 24 uur geldig.</p>

          <div class="warning">
            <strong>Waarschuwing:</strong> Als je dit verzoek niet hebt ingediend, negeer deze e-mail. Je wachtwoord blijft ongewijzigd.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Wachtwoord Resetten

Hallo ${customer.full_name},

Je hebt een verzoek ingediend om je wachtwoord opnieuw in te stellen.

Klik op de onderstaande link om je wachtwoord te wijzigen:
${resetLink}

Deze link is 24 uur geldig.

Waarschuwing: Als je dit verzoek niet hebt ingediend, negeer deze e-mail. Je wachtwoord blijft ongewijzigd.
  `;

  return { html, text, subject: 'Deto — Wachtwoord Resetten' };
}

/**
 * Welcome Email
 */
export function getWelcomeEmail(customer) {
  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welkom bij Deto!</h1>
        </div>
        <div class="content">
          <p>Hallo ${customer.full_name},</p>
          <p>Welkom bij Deto! We zijn blij dat je ons team bent komen versterken.</p>
          
          <h3>Wat kun je nu doen?</h3>
          <ul>
            <li>Boek je eerste detailing-afspraak</li>
            <li>Bekijk onze prijzen en diensten</li>
            <li>Lees wat andere klanten zeggen</li>
          </ul>

          <a href="https://deto.site/boeken.html" class="button">Boek Nu</a>

          <h3>Heb je vragen?</h3>
          <p>Neem contact op via <a href="mailto:info@deto.be">info@deto.be</a> of WhatsApp.</p>

          <p>Veel plezier met Deto!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welkom bij Deto!

Hallo ${customer.full_name},

Welkom bij Deto! We zijn blij dat je ons team bent komen versterken.

WAT KUN JE NU DOEN?
- Boek je eerste detailing-afspraak
- Bekijk onze prijzen en diensten
- Lees wat andere klanten zeggen

Boek Nu: https://deto.site/boeken.html

HEB JE VRAGEN?
Neem contact op via info@deto.be of WhatsApp.

Veel plezier met Deto!
  `;

  return { html, text, subject: 'Welkom bij Deto!' };
}

export default {
  getBookingConfirmationEmail,
  getBookingReminderEmail,
  getBookingCompletionEmail,
  getPasswordResetEmail,
  getWelcomeEmail
};
