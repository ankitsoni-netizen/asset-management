import { readFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { COMPANY } from "./constants";
import { formatDate } from "./utils";

type AllocationMail = {
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  assetName: string;
  uid: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  action: "allocated" | "reallocated";
  allocatedAt: Date;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function subjectFor(mail: AllocationMail) {
  if (mail.action === "reallocated") {
    return `Asset reallocation acknowledgement — ${mail.uid}`;
  }
  return `Asset allocation acknowledgement — ${mail.uid}`;
}

function greetingLine(mail: AllocationMail) {
  if (mail.action === "reallocated") {
    return "This email confirms that a company asset has been reallocated to you.";
  }
  return "This email confirms that a company asset has been allocated to you.";
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E6E8EE;width:160px;color:#667085;font-size:13px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E6E8EE;color:#101828;font-size:13px;font-weight:600;">${value}</td>
    </tr>
  `;
}

function htmlTemplate(mail: AllocationMail) {
  const optional = [
    mail.brand ? row("Brand", mail.brand) : "",
    mail.model ? row("Model", mail.model) : "",
    mail.serialNumber ? row("Serial number", mail.serialNumber) : "",
  ].join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6FB;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E6E8EE;">
            <tr>
              <td style="padding:22px 32px;background:#000000;border-bottom:3px solid #073EFD;">
                <img src="cid:cloutflow-logo" alt="Cloutflow" width="168" style="display:block;width:168px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#073EFD;font-weight:700;">
                  ${mail.action === "reallocated" ? "Reallocation acknowledgement" : "Allocation acknowledgement"}
                </p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0A0D14;">
                  Company asset record
                </h1>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#344054;">
                  Dear ${mail.employeeName},
                </p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#344054;">
                  ${greetingLine(mail)} Please retain the UID below. It is printed on the allocated device and is the official reference for this asset.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${row("Asset", mail.assetName)}
                  ${row("UID", mail.uid)}
                  ${row("Employee", mail.employeeName)}
                  ${row("Department", mail.department)}
                  ${row("Position", mail.position)}
                  ${row("Official email", mail.employeeEmail)}
                  ${row("Date", formatDate(mail.allocatedAt))}
                  ${optional}
                </table>
                <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#344054;">
                  If any detail above is incorrect, write to ${COMPANY.adminEmail}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <p style="margin:0 0 4px;font-size:13px;color:#101828;">Regards,</p>
                <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#101828;">Admin</p>
                <p style="margin:0;font-size:13px;color:#101828;">${COMPANY.name}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#0A0D14;color:#D0D5DD;font-size:11px;line-height:1.6;">
                ${COMPANY.legalName}<br />
                ${COMPANY.address}<br />
                ${COMPANY.adminEmail}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textTemplate(mail: AllocationMail) {
  return [
    `Dear ${mail.employeeName},`,
    "",
    greetingLine(mail),
    "",
    `Asset: ${mail.assetName}`,
    `UID: ${mail.uid}`,
    `Employee: ${mail.employeeName}`,
    `Department: ${mail.department}`,
    `Position: ${mail.position}`,
    `Official email: ${mail.employeeEmail}`,
    `Date: ${formatDate(mail.allocatedAt)}`,
    mail.brand ? `Brand: ${mail.brand}` : "",
    mail.model ? `Model: ${mail.model}` : "",
    mail.serialNumber ? `Serial number: ${mail.serialNumber}` : "",
    "",
    `If any detail above is incorrect, write to ${COMPANY.adminEmail}.`,
    "",
    "Regards,",
    "Admin",
    COMPANY.name,
    COMPANY.legalName,
    COMPANY.address,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendAllocationEmail(mail: AllocationMail) {
  if (!smtpConfigured()) {
    return {
      sent: false,
      error: "Email was not sent because SMTP is not configured.",
    };
  }

  const logoPath = path.join(process.cwd(), "public", "brand", "cloutflow-logo-white.png");
  const logo = await readFile(logoPath);

  await transporter().sendMail({
    from: process.env.SMTP_FROM || `Cloutflow Admin <${COMPANY.adminEmail}>`,
    to: mail.employeeEmail,
    subject: subjectFor(mail),
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

  return { sent: true };
}
