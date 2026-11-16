import type { SendEmail } from '@cloudflare/workers-types';

// The only way the Worker sends email. Tests use memoryMailer().

export interface Mailer {
  sendCode(to: string, code: string): Promise<void>;
}

export interface MemoryMailer extends Mailer {
  sent: { to: string; code: string }[];
}

export function memoryMailer(): MemoryMailer {
  const sent: { to: string; code: string }[] = [];
  return {
    sent,
    async sendCode(to, code) {
      sent.push({ to, code });
    },
  };
}

// Local runs only (ENVIRONMENT is dev): the code is printed in the terminal.
export function consoleMailer(): Mailer {
  return {
    async sendCode(_to, code) {
      console.log(`[dev] Sprout sign-in code: ${code}`);
    },
  };
}

export function cloudflareMailer(binding: SendEmail, from: string): Mailer {
  return {
    async sendCode(to, code) {
      await binding.send({
        from: { email: from, name: 'Sprout' },
        to,
        subject: `Your Sprout code is ${code}`,
        text:
          `Your Sprout sign-in code is ${code}.\n\n` +
          'Type it into the Sprout app. It works for 10 minutes.\n' +
          'If you did not ask for a code, you can ignore this email.\n',
      });
    },
  };
}
