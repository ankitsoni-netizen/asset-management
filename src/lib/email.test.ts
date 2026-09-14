import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  acknowledgementSubject,
  brandModelLine,
  getSmtpConfig,
  htmlTemplate,
  isSendableEmployeeEmail,
  sanitizeEmailError,
  sendAllocationEmail,
  smtpAcceptedMessage,
  textTemplate,
  type AllocationMail,
} from "./email";

const SMTP_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
] as const;

const originalEnv = Object.fromEntries(SMTP_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of SMTP_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configuredEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    SMTP_HOST: "smtp-relay.brevo.com",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user@example.com",
    SMTP_PASS: "smtp-secret-key",
    SMTP_FROM_EMAIL: "from@example.com",
    SMTP_FROM_NAME: "Cloutflow Administration",
    ...overrides,
  };
}

const mail: AllocationMail = {
  employeeName: "Jordan Lee",
  employeeEmail: "jordan@cloutflow.com",
  assetName: "Laptop",
  uid: "CF-AST-000042",
  brand: "Apple",
  model: "MacBook Pro",
  serialNumber: "C02X123",
  allocatedAt: new Date("2026-09-11T10:00:00.000Z"),
};

test("reports missing SMTP configuration without throwing", () => {
  const result = getSmtpConfig({
    SMTP_HOST: "smtp-relay.brevo.com",
    SMTP_USER: "",
    SMTP_PASS: undefined,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /SMTP is not configured/);
    assert.match(result.error, /SMTP_USER/);
    assert.match(result.error, /SMTP_PASS/);
    assert.match(result.error, /SMTP_FROM_EMAIL/);
    assert.doesNotMatch(result.error, /smtp-secret-key/);
  }
});

test("reads complete SMTP configuration from environment variables", () => {
  const result = getSmtpConfig(configuredEnv());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.config.host, "smtp-relay.brevo.com");
    assert.equal(result.config.port, 587);
    assert.equal(result.config.fromName, "Cloutflow Administration");
  }
});

test("builds the required acknowledgement subject and body", () => {
  assert.equal(acknowledgementSubject(mail.uid), "Asset Allocation Acknowledgement — CF-AST-000042");
  assert.equal(brandModelLine("Apple", "MacBook Pro"), "Apple MacBook Pro");
  assert.equal(brandModelLine("Apple", ""), "Apple");
  assert.equal(brandModelLine(null, null), "");

  const text = textTemplate(mail);
  assert.match(text, /^Hi Jordan Lee,/m);
  assert.match(text, /Asset: Laptop/);
  assert.match(text, /Brand\/Model: Apple MacBook Pro/);
  assert.match(text, /Serial Number: C02X123/);
  assert.match(text, /Asset UID: CF-AST-000042/);
  assert.match(text, /Allocation Date:/);
  assert.match(text, /Regards,\nCloutflow Administration/);
  assert.doesNotMatch(text, /Growlance|WeWork|QR|tagline|policy/i);

  const html = htmlTemplate(mail);
  assert.match(html, /alt="Cloutflow"/);
  assert.match(html, /cid:cloutflow-logo/);
  assert.match(html, /Hi Jordan Lee,/);
  assert.doesNotMatch(html, /Growlance|WeWork|QR code|legal/i);
});

test("omits unavailable brand, model, and serial lines", () => {
  const text = textTemplate({ ...mail, brand: null, model: " ", serialNumber: null });
  assert.doesNotMatch(text, /Brand\/Model/);
  assert.doesNotMatch(text, /Serial Number/);
});

test("accepts only official employee email addresses", () => {
  assert.equal(isSendableEmployeeEmail("jordan@cloutflow.com"), true);
  assert.equal(isSendableEmployeeEmail("n/a"), false);
  assert.equal(isSendableEmployeeEmail("someone@gmail.com"), false);
  assert.equal(isSendableEmployeeEmail(""), false);
});

test("treats SMTP acceptance as the send success condition", () => {
  assert.equal(smtpAcceptedMessage({ accepted: ["jordan@cloutflow.com"], rejected: [] }), true);
  assert.equal(smtpAcceptedMessage({ accepted: [], rejected: [] }), false);
  assert.equal(
    smtpAcceptedMessage({ accepted: ["jordan@cloutflow.com"], rejected: ["jordan@cloutflow.com"] }),
    false,
  );
});

test("sanitizes SMTP errors and redacts secrets", () => {
  const env = configuredEnv();
  const sanitized = sanitizeEmailError(
    new Error(`Invalid login smtp-secret-key AUTH PLAIN abc SMTP_PASS=smtp-secret-key`),
    env,
  );
  assert.doesNotMatch(sanitized, /smtp-secret-key/);
  assert.doesNotMatch(sanitized, /PLAIN abc/);
  assert.equal(sanitizeEmailError(new Error("535 Authentication failed"), env), "SMTP authentication failed.");
});

test("sendAllocationEmail records a message id when Brevo accepts the message", async () => {
  const result = await sendAllocationEmail(mail, {
    env: configuredEnv(),
    readLogo: async () => Buffer.from("logo"),
    sendMail: async (options) => {
      assert.equal(options.from, "Cloutflow Administration <from@example.com>");
      assert.equal(options.to, "jordan@cloutflow.com");
      assert.equal(options.subject, "Asset Allocation Acknowledgement — CF-AST-000042");
      assert.equal(typeof options.text, "string");
      assert.equal(typeof options.html, "string");
      return { messageId: "<abc@smtp-relay.brevo.com>", accepted: ["jordan@cloutflow.com"], rejected: [] };
    },
  });
  assert.deepEqual(result, { sent: true, messageId: "<abc@smtp-relay.brevo.com>" });
});

test("sendAllocationEmail keeps the allocation path safe when SMTP is missing", async () => {
  const result = await sendAllocationEmail(mail, {
    env: {},
    readLogo: async () => Buffer.from("logo"),
    sendMail: async () => {
      throw new Error("SMTP should not be called");
    },
  });
  assert.equal(result.sent, false);
  if (!result.sent) {
    assert.equal(result.configured, false);
    assert.match(result.error, /SMTP is not configured/);
  }
});

test("sendAllocationEmail reports SMTP rejection without throwing", async () => {
  const result = await sendAllocationEmail(mail, {
    env: configuredEnv(),
    readLogo: async () => Buffer.from("logo"),
    sendMail: async () => ({ accepted: [], rejected: ["jordan@cloutflow.com"] }),
  });
  assert.equal(result.sent, false);
  if (!result.sent) {
    assert.equal(result.configured, true);
    assert.match(result.error, /did not accept/);
  }
});

test("sendAllocationEmail never delivers to unofficial addresses", async () => {
  const result = await sendAllocationEmail(
    { ...mail, employeeEmail: "jordan@gmail.com" },
    {
      env: configuredEnv(),
      readLogo: async () => Buffer.from("logo"),
      sendMail: async () => {
        throw new Error("SMTP should not be called");
      },
    },
  );
  assert.equal(result.sent, false);
  if (!result.sent) {
    assert.match(result.error, /official email/);
  }
});
