// Supabase Edge Function to send collaboration email via Gmail SMTP
// Deploy this to: supabase/functions/send-collaboration-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

interface EmailRequest {
  to: string;
  subject: string;
  project_name: string;
  inviter_name: string;
  project_id: string;
}

// Gmail SMTP Configuration
const GMAIL_USER = Deno.env.get("GMAIL_USER"); // Your Gmail address (e.g., yourname@gmail.com)
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD"); // Gmail App Password (16 characters)
const APP_URL = Deno.env.get("APP_URL") || "https://your-app.com";

serve(async (req) => {
  try {
    const { to, subject, project_name, inviter_name, project_id } =
      await req.json() as EmailRequest;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("Gmail credentials not configured");
      return new Response(
        JSON.stringify({ error: "Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD secrets." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              background: #4F46E5; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 5px 5px 0 0;
            }
            .content { 
              padding: 20px; 
              background: #f9f9f9; 
              border: 1px solid #ddd;
            }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #666; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SyncScript</h1>
          </div>
          <div class="content">
            <h2>You've been added to a project!</h2>
            <p>Hello,</p>
            <p><strong>${inviter_name}</strong> has added you as a collaborator to the project:</p>
            <p style="font-size: 18px; font-weight: bold; color: #4F46E5;">${project_name}</p>
            <p>You can now access and collaborate on this project.</p>
            <a href="${APP_URL}/dashboard/vault/${project_id}" class="button">
              Open Project
            </a>
          </div>
          <div class="footer">
            <p>This is an automated message from SyncScript.</p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
You've been added to a project!

Hello,

${inviter_name} has added you as a collaborator to the project: ${project_name}

You can now access and collaborate on this project.

Open Project: ${APP_URL}/dashboard/vault/${project_id}

This is an automated message from SyncScript.
    `;

    // Send email via Gmail SMTP
    const client = new SmtpClient();

    await client.connect({
      hostname: "smtp.gmail.com",
      port: 587,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    await client.send({
      from: `SyncScript <${GMAIL_USER}>`,
      to: [to],
      subject: subject || "You have been added to a project",
      content: emailText,
      html: emailHtml,
    });

    await client.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully via Gmail SMTP" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email via Gmail SMTP:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email",
        details: "Check that GMAIL_USER and GMAIL_APP_PASSWORD are set correctly"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
