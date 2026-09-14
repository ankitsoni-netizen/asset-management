import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "./employee";
import { normalizeUid } from "./utils";

export const EMPLOYEE_CSV_MAX_ROWS = 500;
export const EMPLOYEE_CSV_FILENAME = "cloutflow-employees-sample.csv";

export const EMPLOYEE_CSV_HEADERS = ["name", "email", "department", "position", "employee_id"] as const;

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

const HEADER_ALIASES: Record<(typeof EMPLOYEE_CSV_HEADERS)[number], string[]> = {
  name: ["name", "employee_name", "employee name", "full name", "fullname"],
  email: ["email", "official_email", "official email", "email_id", "email id", "official email id"],
  department: ["department", "dept"],
  position: ["position", "title", "role", "job title"],
  employee_id: [
    "employee_id",
    "employee id",
    "employeeid",
    "emp_id",
    "emp id",
    "employee_code",
    "employee code",
    "code",
    "badge",
    "badge_code",
    "badge code",
    "qr",
    "qr_code",
    "qr code",
  ],
};

export const EMPLOYEE_CSV_SAMPLE = [
  EMPLOYEE_CSV_HEADERS.join(","),
  "Jordan Lee,jordan@cloutflow.com,Tech,Engineer,EMP-204",
  "Alex Chen,alex@cloutflow.com,Finance,Analyst,",
  "Sam Patel,sam@cloutflow.com,Ops,Operations Lead,EMP-318",
].join("\r\n") + "\r\n";

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function detectDelimiter(headerLine: string) {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
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
  return value.trim().toLowerCase().replace(/[\s-]+/g, " ");
}

function mapHeaders(cells: string[]) {
  const mapped: Partial<Record<(typeof EMPLOYEE_CSV_HEADERS)[number], number>> = {};
  cells.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    (Object.keys(HEADER_ALIASES) as Array<(typeof EMPLOYEE_CSV_HEADERS)[number]>).forEach((field) => {
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

export function parseEmployeeCsv(text: string): EmployeeCsvParseResult {
  const source = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = source.split("\n").filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { rows: [], errors: [{ row: 1, message: "The CSV is empty. Download the sample sheet and add employee rows." }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = mapHeaders(parseCsvLine(lines[0], delimiter));
  const missing = (["name", "email", "department", "position"] as const).filter((field) => headers[field] === undefined);
  if (missing.length) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `The header row must include ${missing.join(", ")}. Download the sample sheet for the expected columns.`,
        },
      ],
    };
  }

  const dataLines = lines.slice(1);
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
    const row = offset + 2;
    const cells = parseCsvLine(line, delimiter);
    const name = cellAt(cells, headers.name);
    const email = cellAt(cells, headers.email).toLowerCase();
    const department = cellAt(cells, headers.department);
    const position = cellAt(cells, headers.position);
    const rawCode = cellAt(cells, headers.employee_id);
    const code = rawCode ? normalizeUid(rawCode) : "";

    if (!name && !email && !department && !position && !code) return;

    if (name.length < 2) {
      errors.push({ row, message: "Enter an employee name." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row, message: "Enter a valid official email." });
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
      errors.push({ row, message: "This email is duplicated in the sheet." });
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
