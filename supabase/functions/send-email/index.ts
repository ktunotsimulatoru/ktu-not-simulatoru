import { Webhook } from "npm:standardwebhooks@1.0.0";
import { hookMesajlariniOlustur, yedekliGonder } from "./core.mjs";

const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("not allowed", { status: 405 });
  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";
  if (!secret) return new Response(JSON.stringify({error:{http_code:500,message:"Hook yapılandırılmamış."}}),{status:500,headers:jsonHeaders});
  try {
    const raw = await request.text();
    const headers = Object.fromEntries(request.headers);
    const webhook = new Webhook(secret.replace("v1,whsec_", ""));
    const event = webhook.verify(raw, headers);
    const config = {
      resendKey: Deno.env.get("RESEND_API_KEY") || "",
      brevoKey: Deno.env.get("BREVO_API_KEY") || "",
      fromAddress: Deno.env.get("EMAIL_FROM_ADDRESS") || "",
      fromName: Deno.env.get("EMAIL_FROM_NAME") || "KTÜ Not Simülatörü",
      timeoutMs: 8000,
    };
    const messages = hookMesajlariniOlustur(event);
    for (const message of messages) {
      const result = await yedekliGonder(message, config);
      console.log(JSON.stringify({event:"auth_email_sent",action:message.action,provider:result.provider,failover:Boolean(result.primaryReason)}));
    }
    return new Response("{}", { status: 200, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "eposta_gonderilemedi";
    console.error(JSON.stringify({event:"auth_email_failed",reason:message.slice(0,200)}));
    return new Response(JSON.stringify({error:{http_code:500,message:"Doğrulama e-postası gönderilemedi."}}),{status:500,headers:jsonHeaders});
  }
});
