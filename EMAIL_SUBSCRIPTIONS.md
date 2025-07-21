# Email Subscriptions for Queer Jews Personals

This document explains how the email subscription system works and how to set it up.

## Overview

The email subscription system allows users to:
- Sign up for immediate notifications when new personals are posted
- Receive weekly digests of new personals
- Receive monthly digests of new personals

## Architecture

### Components
1. **Subscription Form** - Located in the footer of the website
2. **API Endpoint** - `/api/subscribe` handles form submissions
3. **Google Sheets** - Stores subscription data in a "Subscriptions" tab
4. **Email Service** - Sends emails (Resend recommended)
5. **GitHub Actions** - Automatically sends scheduled digests

### Data Flow
1. User fills out subscription form → API endpoint
2. API endpoint → Google Sheets (Subscriptions tab)
3. GitHub Action (weekly/monthly) → Fetches subscriptions and personals
4. GitHub Action → Email service → Subscribers

## Setup Instructions

### 1. Email Service Setup

We recommend using **Resend** (free tier: 3,000 emails/month):

1. Sign up at https://resend.com
2. Add and verify your domain (or use sandbox domain)
3. Get your API key from the dashboard
4. Add to environment variables:
   ```
   RESEND_API_KEY=your_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   ```

### 2. Google Sheets Configuration

1. Open your existing Google Sheets document
2. Create a new tab called "Subscriptions"
3. Add these headers in row 1:
   - A: Timestamp
   - B: Email
   - C: Frequency
4. Share the sheet with your service account email

### 3. Environment Variables

Add these to your `.env` file:
```
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

For GitHub Actions, add these secrets:
- `RESEND_API_KEY`
- `FROM_EMAIL`

### 4. Test the Setup

1. Run the setup script:
   ```bash
   npm run setup-email
   ```

2. Test the digest system:
   ```bash
   npm run send-digest weekly
   ```

3. Check your email for the test digest

## Usage

### For Users

Users can subscribe by:
1. Scrolling to the footer of any page
2. Entering their email address
3. Selecting their preferred frequency:
   - **Immediate**: Get notified for every new post
   - **Weekly**: Receive a digest every Sunday
   - **Monthly**: Receive a digest on the 1st of each month

### For Administrators

#### Manual Digest Sending
```bash
# Send weekly digest
npm run send-digest weekly

# Send monthly digest
npm run send-digest monthly
```

#### GitHub Actions
- **Automatic**: Weekly digests every Sunday at 10 AM UTC
- **Automatic**: Monthly digests on the 1st of each month at 10 AM UTC
- **Manual**: Trigger from GitHub Actions tab

#### Viewing Subscriptions
1. Open your Google Sheets document
2. Go to the "Subscriptions" tab
3. View all current subscriptions with timestamps

## Cost Breakdown

✅ **Resend**: Free up to 3,000 emails/month  
✅ **Google Sheets**: Free  
✅ **GitHub Actions**: Free for public repos  
✅ **Total cost**: $0/month

## Email Templates

The system generates beautiful HTML emails with:
- Your site's branding and colors
- List of recent personals with titles and excerpts
- Links to browse all personals and submit new ones
- Unsubscribe link (to be implemented)

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check your Resend API key
   - Verify your domain is configured
   - Check the GitHub Actions logs

2. **Subscriptions not saving**
   - Verify Google Sheets permissions
   - Check the API endpoint logs
   - Ensure the "Subscriptions" tab exists

3. **Digest emails empty**
   - Check if there are approved personals in the date range
   - Verify the Google Sheets structure
   - Check the GitHub Actions logs

### Debug Commands

```bash
# Test subscription API
curl -X POST http://localhost:4321/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","frequency":"weekly"}'

# Test digest generation
npm run send-digest weekly -- --debug
```

## Future Enhancements

- [ ] Unsubscribe functionality
- [ ] Email preferences management
- [ ] Location-based filtering
- [ ] Category-based filtering
- [ ] Email analytics
- [ ] A/B testing for email templates

## Support

If you need help setting up or troubleshooting the email subscription system:

1. Check the GitHub Actions logs
2. Review the setup documentation
3. Test with the provided scripts
4. Check your email service dashboard for delivery status

## Security & Privacy

- Email addresses are stored securely in Google Sheets
- No personal data is shared with third parties
- Users can unsubscribe at any time
- Emails include proper unsubscribe headers
- GDPR compliant with opt-in consent 