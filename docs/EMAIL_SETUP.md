# Email Setup for Password Reset

## Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Step Verification
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other** as the device and enter "carbonshine"
4. Click **Generate**
5. Copy the 16-character password (remove spaces)

### Step 3: Update .env File
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Other Email Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=verified-email@yourdomain.com
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
```

## Testing Email Locally

For development, you can use **Ethereal Email** (fake SMTP service):

1. Go to https://ethereal.email/
2. Click **Create Ethereal Account**
3. Use the provided credentials in your .env:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated-username
SMTP_PASSWORD=generated-password
SMTP_FROM=test@ethereal.email
```

All emails will be caught and viewable at https://ethereal.email/messages

## Production Recommendations

For production, use a dedicated email service:

1. **SendGrid** - 100 emails/day free
   - Sign up: https://sendgrid.com/
   - Reliable and easy to set up
   - Good deliverability

2. **Amazon SES** - 62,000 emails/month free (when sent from EC2)
   - Sign up: https://aws.amazon.com/ses/
   - Very cost-effective at scale
   - Requires domain verification

3. **Mailgun** - 5,000 emails/month free (first 3 months)
   - Sign up: https://www.mailgun.com/
   - Good for transactional emails

## Security Notes

⚠️ **Important:**
- Never commit real SMTP credentials to version control
- Use app-specific passwords, not your actual email password
- Keep `.env` in `.gitignore`
- Use environment variables in production
- Verify sender domain for production email services

## Troubleshooting

### Emails not sending
1. Check SMTP credentials are correct
2. Verify SMTP_HOST and SMTP_PORT
3. Check firewall/antivirus blocking port 587
4. Review console logs for error messages

### Gmail "Less secure app access" error
- Use App Password instead (see Gmail setup above)
- Don't use your regular Gmail password

### Emails going to spam
- Verify your domain with email provider
- Set up SPF, DKIM, and DMARC records
- Use a professional email address for SMTP_FROM
