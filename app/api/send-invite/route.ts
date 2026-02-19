import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email, inviteCode, role, leagueName, logoUrl } = await request.json();

    if (!email || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing email or invite code' },
        { status: 400 }
      );
    }

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth?inviteCode=${inviteCode}`;

    // const html = `
    //   <!DOCTYPE html>
    //   <html>
    //     <head>
    //       <style>
    //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    //         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    //         .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
    //         .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
    //         .invite-code { background: white; border: 2px solid #667eea; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; font-family: monospace; }
    //         .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    //         .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="container">
    //         <div class="header">
    //           <h1>🎉 You're Invited!</h1>
    //         </div>
    //         <div class="content">
    //           <p>Hi,</p>
    //           <p>You've been invited to join our Team Management system as a <strong>${role}</strong>.</p>
              
    //           <p>Use the invite code below to create your account:</p>
              
    //           <div class="invite-code">${inviteCode}</div>
              
    //           <p style="text-align: center;">
    //             <a href="${signupUrl}" class="button">Sign Up Now</a>
    //           </p>
              
    //           <p>Or visit: <strong>${signupUrl}</strong></p>
              
    //           <p style="margin-top: 30px; color: #666; font-size: 14px;">
    //             If you have any questions, please contact the admin.
    //           </p>
    //         </div>
    //         <div class="footer">
    //           <p>&copy; 2026 Team Management. All rights reserved.</p>
    //         </div>
    //       </div>
    //     </body>
    //   </html>
    // `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f4f7f9; }
            .container { max-width: 600px; margin: 40px auto; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 40px 20px; text-align: center; }
            .logo { max-width: 80px; margin-bottom: 20px; border-radius: 12px; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
            .content { padding: 40px; }
            .welcome-text { font-size: 18px; font-weight: 600; color: #334155; margin-bottom: 10px; }
            .league-badge { display: inline-block; background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 99px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
            .invite-code { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
            .invite-code span { display: block; font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; font-weight: bold; letter-spacing: 1px; }
            .invite-code strong { font-size: 32px; font-family: 'Courier New', monospace; color: #0f172a; letter-spacing: 4px; }
            .button-wrapper { text-align: center; margin: 30px 0; }
            .button { background-color: #2563eb; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background 0.2s; }
            .link-text { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px; word-break: break-all; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 30px; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${leagueName}" class="logo" />` : ''}
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p class="welcome-text">Hi there,</p>
              <div class="league-badge">${leagueName.toUpperCase()}</div>
              <p>Exciting news! You've been invited to join <strong>${leagueName}</strong> as a <strong>${role}</strong>. Our team uses this platform to manage matches, stats, and communications.</p>
              
              <div class="invite-code">
                <span>Your Unique Invite Code</span>
                <strong>${inviteCode}</strong>
              </div>
              
              <div class="button-wrapper">
                <a href="${signupUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; text-align: center;">
                This link will take you to the secure registration page.
              </p>

              <div class="link-text">
                If the button doesn't work, copy and paste this: <br/>
                ${signupUrl}
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 ${leagueName}. All rights reserved.<br/>
              Sent via Team Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Team Management" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 You\'re Invited to Join Team Management',
      html,
    });

    return NextResponse.json(
      { success: true, message: 'Invite sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
