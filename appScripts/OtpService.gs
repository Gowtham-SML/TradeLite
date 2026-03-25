function sendOtp(phone) {
  if (!phone) return { success: false, error: 'Phone number is required' };

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Orders');
    if (!sheet) return { success: false, error: 'Orders sheet not found' };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, notFound: true, error: 'No previous orders found for this number.' };
    }

    const headers = data[0];
    const phoneCol = headers.indexOf('CustomerPhone');
    const emailCol = headers.indexOf('CustomerEmail');

    if (phoneCol === -1 || emailCol === -1) {
      return { success: false, error: 'Required columns not found in Orders sheet' };
    }

    let targetEmail = null;
    const cleanInputPhone = phone.replace(/\D/g, '');

    for (let i = data.length - 1; i > 0; i--) {
      if (!data[i][phoneCol]) continue;
      const rowPhone = data[i][phoneCol].toString().replace(/\D/g, '').trim();
      if (!rowPhone) continue;
      if (rowPhone === cleanInputPhone) {
        const email = data[i][emailCol] ? data[i][emailCol].toString().trim() : '';
        if (email && email.includes('@') && email.includes('.')) {
          targetEmail = email;
          break;
        }
      }
    }

    if (!targetEmail) {
      return { success: false, notFound: true, error: 'No previous orders found for this number.' };
    }

    const cache = CacheService.getScriptCache();
    if (cache.get('lockout_' + cleanInputPhone)) {
      return { success: false, error: 'Too many attempts. Please wait 10 minutes.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    cache.put('otp_' + cleanInputPhone, otp, 600);
    cache.put('attempts_' + cleanInputPhone, '0', 600);

    const settings = readSettings(ss);
    const storeName = settings['STORE_NAME'] || 'TradeLite';

    let storeEmail = (settings['STORE_EMAIL'] || '').trim();
    storeEmail = storeEmail.replace(/,/g, '.').replace(/\s/g, '');

    const subject = storeName + ' — Your verification code is ' + otp;

    try {
      const emailOptions = {
        htmlBody: buildOtpEmailBody(otp, storeName),
        name: storeName
      };
      if (storeEmail && storeEmail.includes('@') && storeEmail.includes('.')) {
        emailOptions.replyTo = storeEmail;
      }
      GmailApp.sendEmail(targetEmail, subject, '', emailOptions);
    } catch (emailErr) {
      try {
        GmailApp.sendEmail(targetEmail, subject, '', {
          htmlBody: buildOtpEmailBody(otp, storeName),
          name: storeName
        });
      } catch (fallbackErr) {
        return { success: false, error: 'Could not send email. Please try again later.' };
      }
    }

    return { success: true, message: 'OTP sent successfully', maskedEmail: maskEmail(targetEmail) };

  } catch (outerErr) {
    return { success: false, error: 'Server error: ' + outerErr.message };
  }
}

function maskEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name   = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return name[0] + '*@' + domain;
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] + '@' + domain;
}

function verifyOtp(phone, enteredOtp) {
  if (!phone || !enteredOtp) return { success: false, error: 'Phone and OTP are required' };

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const cache = CacheService.getScriptCache();

    if (cache.get('lockout_' + cleanPhone)) {
      return { success: false, error: 'Account locked. Try again later.' };
    }

    const storedOtp = cache.get('otp_' + cleanPhone);
    if (!storedOtp) {
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }

    let attempts = parseInt(cache.get('attempts_' + cleanPhone) || '0');

    if (enteredOtp.trim() === storedOtp.trim()) {
      cache.remove('otp_' + cleanPhone);
      cache.remove('attempts_' + cleanPhone);

      let userOrders = [];
      try {
        const ss = SpreadsheetApp.openById(SHEET_ID);
        const sheet = ss.getSheetByName('Orders');
        if (sheet) {
          const data    = sheet.getDataRange().getValues();
          const headers = data[0];
          const phoneCol   = headers.indexOf('CustomerPhone');
          const orderIdCol = headers.indexOf('OrderID');
          const dateCol    = headers.indexOf('OrderDate');
          const totalCol   = headers.indexOf('Total');
          const itemsCol   = headers.indexOf('Items');
          const notesCol   = headers.indexOf('Notes');

          if (phoneCol !== -1) {
            for (let i = 1; i < data.length; i++) {
              if (!data[i][phoneCol]) continue;
              const rowPhone = data[i][phoneCol].toString().replace(/\D/g, '').trim();
              if (!rowPhone) continue;
              if (rowPhone === cleanPhone) {
                userOrders.push({
                  id:    orderIdCol !== -1 ? data[i][orderIdCol].toString() : '',
                  date:  dateCol    !== -1 ? data[i][dateCol].toString()    : '',
                  total: totalCol   !== -1 ? data[i][totalCol].toString()   : '0',
                  items: itemsCol   !== -1 ? data[i][itemsCol].toString()   : '',
                  notes: notesCol   !== -1 ? data[i][notesCol].toString()   : ''
                });
              }
            }
          }
        }
      } catch (sheetErr) {
        Logger.log('Order fetch error: ' + sheetErr.message);
      }

      return { success: true, message: 'Verified successfully', orders: userOrders };

    } else {
      attempts++;
      if (attempts >= 3) {
        cache.put('lockout_' + cleanPhone, 'locked', 600);
        cache.remove('otp_' + cleanPhone);
        return { success: false, error: 'Too many incorrect attempts. Locked for 10 minutes.', locked: true };
      }
      cache.put('attempts_' + cleanPhone, attempts.toString(), 600);
      return {
        success: false,
        error: 'Incorrect OTP. ' + (3 - attempts) + ' attempt' + (3 - attempts === 1 ? '' : 's') + ' remaining.',
        attemptsRemaining: 3 - attempts
      };
    }

  } catch (outerErr) {
    return { success: false, error: 'Server error: ' + outerErr.message };
  }
}

function buildOtpEmailBody(otp, storeName) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#D1855C;padding:32px 40px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">${storeName}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Order History Verification</p>
      </div>
      <div style="padding:40px;">
        <p style="color:#334155;font-size:16px;margin:0 0 24px;">Your verification code is:</p>
        <div style="background:#F8FAFB;border:2px dashed #D1855C;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:48px;font-weight:800;letter-spacing:12px;color:#D1855C;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:14px;margin:0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#64748b;font-size:14px;margin:0;">If you did not request this, safely ignore this email.</p>
      </div>
      <div style="background:#F8FAFB;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
      </div>
    </div>
  `;
}



// function testEmailAuth() {
//   try {
//     GmailApp.sendEmail(
//       Session.getActiveUser().getEmail(),
//       'TradeLite Gmail Authorization Test',
//       'If you see this email Gmail is now authorized for TradeLite.'
//     );
//     Logger.log('Email sent successfully — Gmail is authorized');
//   } catch(err) {
//     Logger.log('Email failed: ' + err.message);
//   }
// }