import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "./employee";
import { normalizeUid } from "./utils";

export const EMPLOYEE_CSV_MAX_ROWS = 500;
export const EMPLOYEE_CSV_FILENAME = "cloutflow-employees-sample.csv";

export const EMPLOYEE_CSV_HEADERS = ["first_name", "position", "email_id", "department", "employee_id"] as const;

const REQUIRED_FIELDS = ["name", "position", "email", "department"] as const;

export type EmployeeCsvInput = {
  name: string;
  email: string;
  department: string;
  position: string;
  code?: string;
};

export type EmployeeCsvRowError = {
  row: number;
  message: string;
};

export type EmployeeCsvParseResult = {
  rows: Array<EmployeeCsvInput & { row: number }>;
  errors: EmployeeCsvRowError[];
};

type MappedField = "name" | "email" | "department" | "position" | "employee_id";

const HEADER_ALIASES: Record<MappedField, string[]> = {
  name: ["name", "first name", "firstname", "employee name", "emp name", "full name", "fullname", "given name"],
  email: ["email", "official email", "email id", "emailid", "official email id", "mail", "mail id", "e mail"],
  department: ["department", "dept"],
  position: ["position", "title", "role", "job title"],
  employee_id: [
    "employee id",
    "employeeid",
    "emp id",
    "empid",
    "employee code",
    "code",
    "badge",
    "badge code",
    "qr",
    "qr code",
  ],
};

export const EMPLOYEE_CSV_SAMPLE_HEADER = "First Name,Position,Email ID,Department,Employee ID";

export const EMPLOYEE_CSV_SAMPLE = [
  EMPLOYEE_CSV_SAMPLE_HEADER,
  "Jordan,Engineer,jordan@cloutflow.com,Tech,EMP-204",
  "Alex,Analyst,alex@cloutflow.com,Finance,",
  "Sam,Operations Lead,sam@cloutflow.com,Ops,EMP-318",
].join("\r\n") + "\r\n";

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function decodeCsvBytes(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    throw new Error("This looks like an Excel workbook. In Excel or Google Sheets, save it as CSV UTF-8 and upload that file.");
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function isSeparatorHint(line: string) {
  return /^sep\s*=/i.test(line.trim());
}

function detectDelimiter(headerLine: string) {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semicolons) return "\t";
  return semicolons > commas ? ";" : ",";
}

export function parseCsvLine(line: string, delimiter = ",") {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./\\]+/g, " ")
    .replace(/[\s-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function mapHeaders(cells: string[]) {
  const mapped: Partial<Record<MappedField, number>> = {};
  cells.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    (Object.keys(HEADER_ALIASES) as MappedField[]).forEach((field) => {
      if (HEADER_ALIASES[field].includes(normalized) && mapped[field] === undefined) {
        mapped[field] = index;
      }
    });
  });
  return mapped;
}

function cellAt(cells: string[], index: number | undefined) {
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function findHeaderRow(lines: string[]) {
  const limit = Math.min(lines.length, 6);
  for (let index = 0; index < limit; index += 1) {
    if (isSeparatorHint(lines[index])) continue;
    const delimiter = detectDelimiter(lines[index]);
    const headers = mapHeaders(parseCsvLine(lines[index], delimiter));
    const missing = REQUIRED_FIELDS.filter((field) => headers[field] === undefined);
    if (!missing.length) {
      return { index, delimiter, headers };
    }
  }
  return null;
}

export function parseEmployeeCsv(text: string): EmployeeCsvParseResult {
  const source = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = source.split("\n").filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { rows: [], errors: [{ row: 1, message: "The CSV is empty. Download the sample sheet and add employee rows." }] };
  }

  const headerRow = findHeaderRow(lines);
  if (!headerRow) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message:
            "The header row must include First Name, Position, Email ID, and Department. Employee ID is optional. Download the sample sheet for the expected columns.",
        },
      ],
    };
  }

  const { index: headerIndex, delimiter, headers } = headerRow;
  const dataLines = lines.slice(headerIndex + 1);
  if (dataLines.length > EMPLOYEE_CSV_MAX_ROWS) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Upload at most ${EMPLOYEE_CSV_MAX_ROWS} employee rows at a time.`,
        },
      ],
    };
  }

  const rows: EmployeeCsvParseResult["rows"] = [];
  const errors: EmployeeCsvRowError[] = [];
  const emails = new Set<string>();
  const codes = new Set<string>();

  dataLines.forEach((line, offset) => {
    const row = headerIndex + offset + 2;
    const cells = parseCsvLine(line, delimiter);
    const name = cellAt(cells, headers.name);
    const email = cellAt(cells, headers.email).toLowerCase();
    const department = cellAt(cells, headers.department);
    const position = cellAt(cells, headers.position);
    const rawCode = cellAt(cells, headers.employee_id);
    const code = rawCode ? normalizeUid(rawCode) : "";

    if (!name && !email && !department && !position && !code) return;

    if (name.length < 2) {
      errors.push({ row, message: "Enter a first name." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row, message: "Enter a valid official email ID." });
      return;
    }
    if (!isOfficialEmployeeEmail(email)) {
      errors.push({ row, message: OFFICIAL_EMAIL_HINT });
      return;
    }
    if (department.length < 2) {
      errors.push({ row, message: "Enter a department." });
      return;
    }
    if (position.length < 2) {
      errors.push({ row, message: "Enter a position." });
      return;
    }
    if (code.length > 120) {
      errors.push({ row, message: "Employee ID is too long." });
      return;
    }
    if (emails.has(email)) {
      errors.push({ row, message: "This email ID is duplicated in the sheet." });
      return;
    }
    if (code && codes.has(code)) {
      errors.push({ row, message: "This employee ID is duplicated in the sheet." });
      return;
    }

    emails.add(email);
    if (code) codes.add(code);
    rows.push({
      row,
      name,
      email,
      department,
      position,
      code: code || undefined,
    });
  });

  if (!rows.length && !errors.length) {
    errors.push({ row: 1, message: "Add at least one employee row below the header." });
  }

  return { rows, errors };
}
