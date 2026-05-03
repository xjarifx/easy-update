import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.CLIENT_URL || "http://localhost:5173";
const FROM_EMAIL = "Easy Update <onboarding@resend.dev>"; // Update to your verified domain

export const sendWelcomeEmail = async (to: string) => {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Easy Update!",
    html: `
      <h1>Thank you for signing up!</h1>
      <p>Welcome to <strong>Easy Update</strong> – your personal notice and event manager.</p>
      <h2>How to use the app:</h2>
      <ol>
        <li><strong>Input page:</strong> Use the AI-powered input to create notices from natural language. Just describe your event and let AI extract the details.</li>
        <li><strong>Notice page:</strong> View and manage all your notices. Edit, complete, or delete them as needed.</li>
        <li><strong>Calendar page:</strong> See your notices displayed on a calendar for a visual overview of your schedule.</li>
        <li><strong>Settings page:</strong> Configure your AI provider (OpenRouter, OpenAI, Anthropic, or Google) and add your API key to enable AI features.</li>
      </ol>
      <p>You'll need an API key for the AI features. Get a free key from <a href="https://openrouter.ai">OpenRouter.ai</a> – they offer free access to many AI models.</p>
      <p><a href="${APP_URL}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Open Easy Update</a></p>
      <p>Happy organizing!</p>
    `,
  });

  if (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }

  return true;
};
