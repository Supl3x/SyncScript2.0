// Supabase Edge Function to send collaboration email
// Deploy this to: supabase/functions/send-collaboration-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  to: string;
  subject: string;
  project_name: string;
  inviter_name: string;
  project_id: string;
}

serve(async (req) => {
  try {
    const { to, subject, project_name, inviter_name, project_id } =
      await req.json() as EmailRequest;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SyncScript <noreply@syncscript.app>", // Change to your domain
        to: [to],
        subject: subject || "You have been added to a project",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>SyncScript</h1>
                </div>
                <div class="content">
                  <h2>You've been added to a project!</h2>
                  <p>Hello,</p>
                  <p><strong>${inviter_name}</strong> has added you as a collaborator to the project:</p>
                  <p style="font-size: 18px; font-weight: bold; color: #4F46E5;">${project_name}</p>
                  <p>You can now access and collaborate on this project.</p>
                  <a href="${Deno.env.get("APP_URL") || "https://your-app.com"}/dashboard/vault/${project_id}" class="button">
                    Open Project
                  </a>
                </div>
                <div class="footer">
                  <p>This is an automated message from SyncScript.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Resend API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailData = await emailResponse.json();
    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
