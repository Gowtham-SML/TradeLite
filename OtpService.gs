// Called by frontend to send OTP
function sendOtp(phone, email) {
  // Validate inputs
  if (!phone || !email) {
    return { success: false, error: 'Phone and email are required' };
  }
  
  // Check lockout
  const lockoutKey = 'lockout_' + phone;
  const lockout = CacheService.getScriptCache().get(lockoutKey);
  if (lockout) {
    return { success: false, error: 'Too many attempts. Please wait before trying again.' };
  }
  
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in cache — expires in 10 minutes
  CacheService.getScriptCache().put('otp_' + phone, otp, 600);
  
  // Reset attempt counter
  CacheService.getScriptCache().put('attempts_' + phone, '0', 600);
  
  // Send email via Gmail
  const storeName = getSettingValue('STORE_NAME') || 'TradeLite';
  const subject = storeName + ' — Your verification code is ' + otp;
  const body = buildOtpEmailBody(otp, storeName);
  
  GmailApp.sendEmail(email, subject, '', { htmlBody: body });
  
  return { success: true, message: 'OTP sent successfully' };
}

// Called by frontend to verify OTP
function verifyOtp(phone, enteredOtp) {
  if (!phone || !enteredOtp) {
    return { success: false, error: 'Phone and OTP are required' };
  }
  
  // Check lockout
  const lockoutKey = 'lockout_' + phone;
  if (CacheService.getScriptCache().get(lockoutKey)) {
    return { success: false, error: 'Account locked. Try again later.' };
  }
  
  // Get stored OTP
  const storedOtp = CacheService.getScriptCache().get('otp_' + phone);
  
  if (!storedOtp) {
    return { success: false, error: 'OTP expired. Please request a new one.' };
  }
  
  // Check attempts
  const attemptsKey = 'attempts_' + phone;
  let attempts = parseInt(CacheService.getScriptCache().get(attemptsKey) || '0');
  
  if (enteredOtp.trim() === storedOtp.trim()) {
    // Correct — clear cache
    CacheService.getScriptCache().remove('otp_' + phone);
    CacheService.getScriptCache().remove(attemptsKey);
    return { success: true, message: 'Verified successfully' };
  } else {
    // Wrong — increment attempts
    attempts++;
    if (attempts >= 3) {
      // Lock for 10 minutes
      CacheService.getScriptCache().put(lockoutKey, 'locked', 600);
      CacheService.getScriptCache().remove('otp_' + phone);
      return { success: false, error: 'Too many attempts. Locked for 10 minutes.', locked: true };
    }
    CacheService.getScriptCache().put(attemptsKey, attempts.toString(), 600);
    return { success: false, error: 'Incorrect OTP', attemptsRemaining: 3 - attempts };
  }
}

// HTML email template
function buildOtpEmailBody(otp, storeName) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: #D1855C; padding: 32px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${storeName}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Order History Verification</p>
      </div>
      <div style="padding: 40px;">
        <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">Your verification code is:</p>
        <div style="background: #F8FAFB; border: 2px dashed #D1855C; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #D1855C;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 14px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="background: #F8FAFB; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
      </div>
    </div>
  `;
}

// Helper to read from Settings sheet
function getSettingValue(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

// Add to existing doGet() or create doPost()
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  let result;
  
  if (action === 'sendOtp') {
    result = sendOtp(params.phone, params.email);
  } else if (action === 'verifyOtp') {
    result = verifyOtp(params.phone, params.otp);
  } else {
    result = { success: false, error: 'Unknown action' };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
