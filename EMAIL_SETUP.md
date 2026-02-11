# Email Invite Setup Guide

## Overview
The team management application now supports sending invite codes via email to new users. When admins create invites, they can automatically send beautiful HTML emails with the invite code and a direct sign-up link.

## What's Been Implemented

### 1. **Email API Route** (`app/api/send-invite/route.ts`)
- Node.js/Next.js API endpoint for sending emails
- Uses **nodemailer** with Gmail SMTP
- Accepts: email, inviteCode, and role
- Sends HTML-formatted emails with invite code and sign-up link
- Includes error handling and validation

### 2. **Updated Onboarding Page** (`app/admin/onboarding/page.tsx`)
- New checkbox: "Send invite via email" (enabled by default)
- After creating an invite, automatically calls the email API
- Shows success/warning messages if email fails
- Displays invite code in UI as fallback if email sending fails

### 3. **Environment Variables** (`.env.local`)
Required configuration:
```
EMAIL_USER=your_gmail_email@gmail.com
EMAIL_PASS=your_gmail_app_password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Instructions

### Step 1: Enable Gmail App Password
Since you're using Gmail SMTP:

1. Go to [Google Account Settings](https://myaccount.google.com)
2. Navigate to **Security** → **App passwords**
3. Select "Mail" and "Windows Computer" (or your device)
4. Google will generate a 16-character password
5. Copy this password (without spaces)

### Step 2: Configure Environment Variables
Update `.env.local` with:

```env
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # 16-char password from Step 1

# App URL for invite links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Production:**
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 3: Test the Flow

1. Sign in as an admin
2. Go to "User Management" → "Create Invite"
3. Enter email, select role, and check "Send invite via email"
4. Click "Create Invite"
5. Check the recipient's inbox for the email

## Email Format

Users will receive a professional HTML email containing:
- Welcome message
- Invite code (highlighted and easy to copy)
- Direct sign-up link (includes invite code)
- Call-to-action button
- Footer with branding

Example invite link in email:
```
https://yourdomain.com/auth?inviteCode=ABC123DEF
```

## Features

✅ **One-click signup** - Users can click the link and code pre-fills  
✅ **Manual code entry** - Users can also enter code manually  
✅ **Fallback** - If email fails, code still shows in admin panel  
✅ **Checkbox control** - Optional email sending (can share code manually)  
✅ **Error handling** - Graceful failures with informative messages  
✅ **Beautiful HTML** - Professional, branded email template  

## Troubleshooting

### "Email failed to send" error

**Check 1: Gmail App Password**
- Verify you're using the 16-character app password (not your Gmail password)
- No spaces in the password in `.env.local`

**Check 2: Environment Variables**
- Restart dev server after updating `.env.local`
- Verify `EMAIL_USER` and `EMAIL_PASS` are set

**Check 3: Gmail Security**
- Ensure "Less secure app access" is not blocking (modern Gmail uses app passwords)
- Check Gmail account's "Security" → "App passwords" status

**Check 4: Network/Firewall**
- Port 465 (Gmail SMTP) must be accessible
- Some corporate firewalls may block outbound mail

### Email arrives but links don't work

- Verify `NEXT_PUBLIC_APP_URL` matches your domain
- For local testing: use `http://localhost:3000`
- For production: use `https://yourdomain.com`

## Production Deployment

When deploying to production:

1. Update `.env.local` (or environment variables in hosting):
   ```
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

2. Rebuild and deploy
3. Test an invite to ensure emails are being sent

## Security Notes

- App passwords are safer than Gmail passwords
- Each app password works only for that app
- Regenerate app passwords if compromised
- Never commit `.env.local` to version control (use `.env.local.example` instead)

## Support

If emails aren't sending:
1. Check browser console for error messages
2. Check server logs (terminal output)
3. Verify all environment variables are set
4. Ensure Gmail account exists and app password is valid
