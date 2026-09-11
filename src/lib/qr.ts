import QRCode from "qrcode";
import { appUrl } from "./utils";

export function assetUrl(uid: string) {
  return `${appUrl()}/a/${encodeURIComponent(uid)}`;
}

export async function generateQrDataUrl(uid: string) {
  return QRCode.toDataURL(assetUrl(uid), {
    width: 480,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0A0D14",
      light: "#FFFFFF",
    },
  });
}
