import QRCode from "qrcode";
import { normalizeUid } from "./utils";

export function qrPayloadForUid(uid: string) {
  return normalizeUid(uid);
}

export async function generateQrDataUrl(uid: string) {
  return QRCode.toDataURL(qrPayloadForUid(uid), {
    width: 480,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0A0D14",
      light: "#FFFFFF",
    },
  });
}
