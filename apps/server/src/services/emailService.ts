// Email service removed - no longer using Resend
// Welcome emails are disabled

import logger from "../utils/logger.js";

export const sendWelcomeEmail = async (_to: string) => {
  logger.info("Welcome email sending skipped - email service disabled");
  return true;
};
