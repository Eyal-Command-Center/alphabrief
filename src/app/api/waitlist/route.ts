import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    // Notify you of the new signup
    await resend.emails.send({
      from: 'AlphaBrief <hello@alphabrief.io>',
      to: 'geyalm@gmail.com',
      subject: '🟢 New AlphaBrief waitlist signup',
      html: `
        <div style="font-family: sans-serif; padding: 24px;">
          <h2 style="color: #10d9a8;">New waitlist signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p style="color: #666; font-size: 14px;">alphabrief.io</p>
        </div>
      `,
    })

    // Welcome email to the new signup
    await resend.emails.send({
      from: 'AlphaBrief <hello@alphabrief.io>',
      to: email,
      subject: "You're on the AlphaBrief waitlist",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f172a; color: #fff;">
          <div style="margin-bottom: 32px;">
            <span style="color: #34d399; font-size: 28px; font-family: Georgia, serif;">α</span>
            <span style="color: #fff; font-weight: 600; font-size: 18px; margin-left: 8px;">Alpha<span style="color: #34d399;">Brief</span></span>
          </div>
          <h1 style="color: #fff; font-size: 22px; font-weight: 600; margin-bottom: 12px;">You're on the list.</h1>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Thanks for signing up. We're building AlphaBrief in public — an AI-powered morning brief for retail investors who want to know what matters, fast.
          </p>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
            We'll reach out when early access opens. In the meantime, follow the build on X: <a href="https://x.com/eyalgilad" style="color: #34d399;">@eyalgilad</a>
          </p>
          <p style="color: #475569; font-size: 13px;">— Eyal, building AlphaBrief</p>
        </div>
      `,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Resend error:', error)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
