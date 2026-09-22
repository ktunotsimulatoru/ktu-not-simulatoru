const RESEND_URL = 'https://api.resend.com/emails';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const FAILOVER_CODES = new Set(['daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded','application_error','service_unavailable']);

function htmlKacir(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function konuVeBaslik(action) {
  const metinler = {
    signup: ['KTÜ Not Simülatörü hesabını doğrula','Hesabını doğrula'],
    recovery: ['KTÜ Not Simülatörü şifre sıfırlama','Şifreni sıfırla'],
    email_change: ['E-posta değişikliğini doğrula','E-posta değişikliğini doğrula'],
    invite: ['KTÜ Not Simülatörü daveti','Davetini tamamla'],
    magiclink: ['KTÜ Not Simülatörü giriş kodu','Girişini doğrula'],
    reauthentication: ['KTÜ Not Simülatörü güvenlik kodu','İşlemini doğrula'],
  };
  return metinler[action] || ['KTÜ Not Simülatörü doğrulama kodu','İşlemini doğrula'];
}

function mesajOlustur(recipient, token, action) {
  if (!recipient || !/^[^@\s]+@ogr\.ktu\.edu\.tr$/i.test(recipient) || !token) throw new Error('gecersiz_hook_verisi');
  const [subject, title] = konuVeBaslik(action);
  const safeToken = htmlKacir(token);
  const text = `${title}\n\nDoğrulama kodun: ${token}\n\nBu kodu kimseyle paylaşma. Bu işlemi sen başlatmadıysan e-postayı görmezden gelebilirsin.`;
  const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:28px"><div style="font-size:13px;font-weight:700;color:#006fee;letter-spacing:.08em">KTÜ NOT SİMÜLATÖRÜ</div><h1 style="margin:12px 0 10px;font-size:24px">${htmlKacir(title)}</h1><p style="color:#52525b;line-height:1.6">Aşağıdaki kodu açık olan doğrulama ekranına gir:</p><div style="margin:22px 0;padding:16px;border-radius:12px;background:#eef6ff;color:#006fee;text-align:center;font-size:30px;font-weight:700;letter-spacing:.18em">${safeToken}</div><p style="margin:0;color:#71717a;font-size:13px;line-height:1.6">Bu kodu kimseyle paylaşma. Bu işlemi sen başlatmadıysan e-postayı görmezden gelebilirsin.</p></div></div></body></html>`;
  return { recipient, subject, text, html, action };
}

export function hookMesajlariniOlustur(event) {
  const user = event?.user || {};
  const data = event?.email_data || {};
  const action = String(data.email_action_type || 'verification');
  if (action === 'email_change' && user.new_email && data.token_new) {
    const messages = [];
    if (user.email && data.token) messages.push(mesajOlustur(user.email, data.token, action));
    messages.push(mesajOlustur(user.new_email, data.token_new, action));
    return messages;
  }
  return [mesajOlustur(user.email, data.token || data.token_new, action)];
}

async function idempotencyKey(message) {
  const input = new TextEncoder().encode(`${message.recipient}|${message.action}|${message.subject}|${message.text}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return `auth-${[...new Uint8Array(digest)].map(value => value.toString(16).padStart(2,'0')).join('')}`;
}

async function jsonOku(response) {
  try { return await response.json(); } catch { return {}; }
}

export async function resendIleGonder(message, config, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method:'POST', signal:AbortSignal.timeout(config.timeoutMs || 8000),
      headers:{Authorization:`Bearer ${config.resendKey}`,'Content-Type':'application/json','Idempotency-Key':await idempotencyKey(message)},
      body:JSON.stringify({from:`${config.fromName} <${config.fromAddress}>`,to:[message.recipient],subject:message.subject,html:message.html,text:message.text}),
    });
  } catch (error) { return {ok:false,failover:true,reason:error?.name === 'TimeoutError' ? 'timeout' : 'network'}; }
  const body = await jsonOku(response);
  if (response.ok) return {ok:true,provider:'resend',id:body.id || null};
  const code = String(body?.name || body?.code || '');
  return {ok:false,failover:response.status === 429 || response.status >= 500 || FAILOVER_CODES.has(code),reason:code || `http_${response.status}`};
}

export async function brevoIleGonder(message, config, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(BREVO_URL, {
      method:'POST', signal:AbortSignal.timeout(config.timeoutMs || 8000),
      headers:{'api-key':config.brevoKey,'Content-Type':'application/json','accept':'application/json'},
      body:JSON.stringify({sender:{name:config.fromName,email:config.fromAddress},to:[{email:message.recipient}],subject:message.subject,htmlContent:message.html,textContent:message.text,
        headers:{'X-Mailer-Source':'ktu-not-simulatoru-auth'}}),
    });
  } catch (error) { return {ok:false,provider:'brevo',reason:error?.name === 'TimeoutError' ? 'timeout' : 'network'}; }
  const body = await jsonOku(response);
  if (response.ok) return {ok:true,provider:'brevo',id:body.messageId || null};
  return {ok:false,provider:'brevo',reason:String(body?.code || body?.message || `http_${response.status}`).slice(0,160)};
}

export async function yedekliGonder(message, config, fetchImpl = fetch) {
  if (!config.resendKey || !config.brevoKey || !config.fromAddress) throw new Error('eposta_yapilandirmasi_eksik');
  const primary = await resendIleGonder(message, config, fetchImpl);
  if (primary.ok) return primary;
  if (!primary.failover) throw new Error(`resend_kalici_hata:${primary.reason}`);
  const backup = await brevoIleGonder(message, config, fetchImpl);
  if (!backup.ok) throw new Error(`tum_saglayicilar_basarisiz:${primary.reason}:${backup.reason}`);
  return {...backup,primaryReason:primary.reason};
}
