import type { AllocationAction, AssetStatus } from "@/types/database";

export type EmailDeliveryStatus = "pending" | "sent" | "failed" | "not_configured";

export type AssetTypeRecord = {
  id: string;
  name: string;
  isCustom: boolean;
  createdAt: Date;
};

export type StoredImageRecord = {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: Date;
};

export type AllocationImageRecord = StoredImageRecord & {
  allocationId: string;
};

export type AssetImageRecord = StoredImageRecord & {
  assetId: string;
};

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AllocationRecord = {
  id: string;
  assetId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  employeeEmail: string;
  action: AllocationAction;
  allocatedAt: Date;
  endedAt: Date | null;
  isCurrent: boolean;
  confirmationNote: string | null;
  emailSent: boolean;
  emailError: string | null;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailSentAt: Date | null;
  emailAttemptCount: number;
  emailMessageId: string | null;
  emailLastAttemptedAt: Date | null;
  images: AllocationImageRecord[];
};

export type AssetRecord = {
  id: string;
  uid: string;
  assetTypeId: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
  assetType: AssetTypeRecord;
  images: AssetImageRecord[];
};

export type AllocationWithAsset = AllocationRecord & {
  asset: {
    id: string;
    uid: string;
    status: AssetStatus;
    serialNumber: string | null;
    brand: string | null;
    model: string | null;
    assetType: AssetTypeRecord;
  };
};
