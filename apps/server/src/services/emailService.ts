// Email service removed - no longer using Resend
// Welcome emails are disabled

export const sendWelcomeEmail = async (_to: string) => {
  console.log("Welcome email sending skipped - email service disabled");
  return true;
};
