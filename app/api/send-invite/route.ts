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
    const { email, inviteCode, role } = await request.json();

    if (!email || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing email or invite code' },
        { status: 400 }
      );
    }

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth?inviteCode=${inviteCode}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .invite-code { background: white; border: 2px solid #667eea; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; font-family: monospace; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              <p>You've been invited to join our Team Management system as a <strong>${role}</strong>.</p>
              
              <p>Use the invite code below to create your account:</p>
              
              <div class="invite-code">${inviteCode}</div>
              
              <p style="text-align: center;">
                <a href="${signupUrl}" class="button">Sign Up Now</a>
              </p>
              
              <p>Or visit: <strong>${signupUrl}</strong></p>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you have any questions, please contact the admin.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Team Management. All rights reserved.</p>
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
