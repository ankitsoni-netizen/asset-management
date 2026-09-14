import { readFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { isOfficialEmployeeEmail } from "./employee";
import { formatDate } from "./utils";

export type AllocationMail = {
  employeeName: string;
  employeeEmail: string;
  assetName: string;
  uid: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  allocatedAt: Date;
};

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

export type SmtpConfigResult =
  | { ok: true; config: SmtpConfig }
  | { ok: false; error: string };

export type SendMailInfo = {
  messageId?: string;
  accepted?: unknown;
  rejected?: unknown;
  response?: string;
};

export type SendMailFn = (options: nodemailer.SendMailOptions) => Promise<SendMailInfo>;

export type SendAllocationEmailResult =
  | { sent: true; messageId: string | null }
  | { sent: false; error: string; configured: boolean };

type EnvMap = Record<string, string | undefined>;

const SMTP_REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME"] as const;

export function getSmtpConfig(env: EnvMap = process.env): SmtpConfigResult {
  const missing = SMTP_REQUIRED.filter((key) => !env[key]?.trim());
  if (missing.length) {
    return {
      ok: false,
      error: `SMTP is not configured. Missing ${missing.join(", ")}.`,
    };
  }

  const portRaw = env.SMTP_PORT?.trim() || "587";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    return { ok: false, error: "SMTP is not configured. SMTP_PORT must be a valid port number." };
  }

  return {
    ok: true,
    config: {
      host: env.SMTP_HOST!.trim(),
      port,
      user: env.SMTP_USER!.trim(),
      pass: env.SMTP_PASS!.trim(),
      fromEmail: env.SMTP_FROM_EMAIL!.trim(),
      fromName: env.SMTP_FROM_NAME!.trim(),
    },
  };
}

export function isSendableEmployeeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return isOfficialEmployeeEmail(normalized);
}

export function brandModelLine(brand?: string | null, model?: string | null) {
  const parts = [brand?.trim(), model?.trim()].filter((part): part is string => Boolean(part));
  return parts.join(" ");
}

export function acknowledgementSubject(uid: string) {
  return `Asset Allocation Acknowledgement — ${uid}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function detailLines(mail: AllocationMail) {
  const lines = [`Asset: ${mail.assetName}`];
  const brandModel = brandModelLine(mail.brand, mail.model);
  if (brandModel) lines.push(`Brand/Model: ${brandModel}`);
  const serial = mail.serialNumber?.trim();
  if (serial) lines.push(`Serial Number: ${serial}`);
  lines.push(`Asset UID: ${mail.uid}`);
  lines.push(`Allocation Date: ${formatDate(mail.allocatedAt)}`);
  return lines;
}

export function textTemplate(mail: AllocationMail) {
  return [
    `Hi ${mail.employeeName},`,
    "",
    "This is to confirm that the following company asset has been allocated to you:",
    "",
    ...detailLines(mail),
    "",
    "Please keep the asset UID available for any future reference regarding this device.",
    "",
    "If any of the information above is incorrect, please contact the Cloutflow administration team.",
    "",
    "Regards,",
    "Cloutflow Administration",
  ].join("\n");
}

export function htmlTemplate(mail: AllocationMail) {
  const rows = detailLines(mail)
    .map((line) => {
      const [label, ...rest] = line.split(": ");
      const value = rest.join(": ");
      return `<tr>
          <td style="padding:8px 0;color:#4B5563;font-size:14px;line-height:1.5;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;line-height:1.5;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(acknowledgementSubject(mail.uid))}</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F6F8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F6F8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E5E7EB;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
                <img src="cid:cloutflow-logo" alt="Cloutflow" width="168" style="display:block;width:168px;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(mail.employeeName)},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                  This is to confirm that the following company asset has been allocated to you:
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                  ${rows}
                </table>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                  Please keep the asset UID available for any future reference regarding this device.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                  If any of the information above is incorrect, please contact the Cloutflow administration team.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.6;">Regards,<br />Cloutflow Administration</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function smtpAcceptedMessage(info: SendMailInfo) {
  const accepted = normalizeAddresses(info.accepted);
  const rejected = normalizeAddresses(info.rejected);
  return accepted.length > 0 && rejected.length === 0;
}

function normalizeAddresses(value: unknown): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => {
      if (typeof item === "string") return item.trim().toLowerCase();
      if (item && typeof item === "object" && "address" in item && typeof item.address === "string") {
        return item.address.trim().toLowerCase();
      }
      return "";
    })
    .filter(Boolean);
}

export function sanitizeEmailError(error: unknown, env: EnvMap = process.env) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const secrets = [env.SMTP_PASS, env.SMTP_USER, env.SMTP_FROM_EMAIL].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  let sanitized = raw.replace(/\s+/g, " ").trim();
  for (const secret of secrets) {
    sanitized = sanitized.split(secret).join("[redacted]");
  }
  sanitized = sanitized
    .replace(/(pass(word)?|pwd|secret|api[_-]?key|smtp[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/AUTH\s+[^\s]+/gi, "AUTH [redacted]");

  if (/EAUTH|invalid login|authentication failed|535/i.test(sanitized)) {
    return "SMTP authentication failed.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket/i.test(sanitized)) {
    return "Could not reach the SMTP server.";
  }
  if (!sanitized) return "Email delivery failed.";
  return sanitized.slice(0, 240);
}

export function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  } satisfies SMTPTransport.Options);
}

async function defaultReadLogo() {
  const logoPath = path.join(process.cwd(), "public", "brand", "cloutflow-logo-color.png");
  return readFile(logoPath);
}

export async function sendAllocationEmail(
  mail: AllocationMail,
  deps: {
    env?: EnvMap;
    sendMail?: SendMailFn;
    readLogo?: () => Promise<Buffer>;
  } = {},
): Promise<SendAllocationEmailResult> {
  const env = deps.env ?? process.env;
  const smtp = getSmtpConfig(env);
  if (!smtp.ok) {
    return { sent: false, configured: false, error: smtp.error };
  }

  if (!isSendableEmployeeEmail(mail.employeeEmail)) {
    return {
      sent: false,
      configured: true,
      error: "Acknowledgement email was not sent because the employee address is not a valid official email.",
    };
  }

  try {
    const sendMail =
      deps.sendMail ??
      (async (options) => {
        const info = await createSmtpTransport(smtp.config).sendMail(options);
        return info;
      });
    const logo = await (deps.readLogo ?? defaultReadLogo)();
    const info = await sendMail({
      from: `${smtp.config.fromName} <${smtp.config.fromEmail}>`,
      to: mail.employeeEmail.trim().toLowerCase(),
      subject: acknowledgementSubject(mail.uid),
      text: textTemplate(mail),
      html: htmlTemplate(mail),
      attachments: [
        {
          filename: "cloutflow-logo.png",
          content: logo,
          cid: "cloutflow-logo",
        },
      ],
    });

    if (!smtpAcceptedMessage(info)) {
      return {
        sent: false,
        configured: true,
        error: "The SMTP server did not accept the acknowledgement message.",
      };
    }

    return { sent: true, messageId: info.messageId?.trim() || null };
  } catch (error) {
    return {
      sent: false,
      configured: true,
      error: sanitizeEmailError(error, env),
    };
  }
}
