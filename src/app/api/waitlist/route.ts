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
      from: 'onboarding@resend.dev',
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

    return Response.json({ success: true })
  } catch (error) {
    console.error('Resend error:', error)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
