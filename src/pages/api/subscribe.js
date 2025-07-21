// Resend API configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_CONTACT_LIST_ID = process.env.RESEND_CONTACT_LIST_ID;

async function addToResendList(email, frequency) {
  try {
    const response = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        firstName: 'Subscriber',
        lastName: '',
        unsubscribed: false,
        audienceId: RESEND_CONTACT_LIST_ID,
        metadata: {
          frequency: frequency,
          source: 'queerjews.com',
          subscribedAt: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Resend contact list error:', error);
    throw error;
  }
}

export async function POST({ request }) {
  try {
    const { email, frequency } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required environment variables
    if (!RESEND_API_KEY || !RESEND_CONTACT_LIST_ID) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add to Resend contact list
    await addToResendList(email, frequency);
    console.log(`✅ Added ${email} to Resend contact list`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully subscribed! Check your email to confirm.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return new Response(JSON.stringify({ error: 'Failed to subscribe. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 