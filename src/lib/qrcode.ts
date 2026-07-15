import QRCode from "qrcode";

/**
 * Generate a QR code as a base64-encoded PNG data URL.
 * The QR code encodes the booking reference for ticket validation.
 */
export async function generateQRCode(bookingRef: string): Promise<string> {
  const qrData = JSON.stringify({
    bookingRef,
    verifyUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/verify/${bookingRef}`,
    timestamp: new Date().toISOString(),
  });

  const dataUrl = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: "#1a1a2e",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  return dataUrl;
}

/**
 * Generate QR code as a buffer (for email attachment).
 */
export async function generateQRCodeBuffer(
  bookingRef: string
): Promise<Buffer> {
  const qrData = JSON.stringify({
    bookingRef,
    verifyUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/verify/${bookingRef}`,
    timestamp: new Date().toISOString(),
  });

  return QRCode.toBuffer(qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: "#1a1a2e",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
