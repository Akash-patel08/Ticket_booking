import nodemailer from "nodemailer";
import { generateQRCodeBuffer } from "./qrcode";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface BookingEmailData {
  to: string;
  customerName: string;
  bookingRef: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  seats: string[];
  totalAmount: number;
}

/**
 * Send booking confirmation email with QR code ticket attached.
 */
export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<boolean> {
  try {
    const qrBuffer = await generateQRCodeBuffer(data.bookingRef);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
          .body { padding: 32px; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
          .detail-label { color: #666; font-size: 14px; }
          .detail-value { color: #1a1a2e; font-weight: 600; font-size: 14px; }
          .qr-section { text-align: center; padding: 24px; background: #f8f9ff; border-radius: 12px; margin: 24px 0; }
          .qr-section img { width: 200px; height: 200px; }
          .qr-section p { color: #666; font-size: 13px; margin-top: 12px; }
          .booking-ref { font-family: monospace; font-size: 20px; color: #667eea; font-weight: 700; letter-spacing: 2px; }
          .footer { text-align: center; padding: 24px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; }
          .total { font-size: 24px; color: #667eea; font-weight: 700; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Booking Confirmed!</h1>
            <p>Your tickets are ready</p>
          </div>
          <div class="body">
            <p>Hi <strong>${data.customerName}</strong>,</p>
            <p>Your booking has been confirmed. Here are your details:</p>
            
            <div class="detail-row">
              <span class="detail-label">Event</span>
              <span class="detail-value">${data.eventTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${data.eventDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time</span>
              <span class="detail-value">${data.eventTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Venue</span>
              <span class="detail-value">${data.venueName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Seats</span>
              <span class="detail-value">${data.seats.join(", ")}</span>
            </div>
            
            <div class="total">₹${data.totalAmount.toFixed(2)}</div>
            
            <div class="qr-section">
              <p class="booking-ref">${data.bookingRef}</p>
              <img src="cid:qrcode" alt="QR Code Ticket" />
              <p>Show this QR code at the venue entrance</p>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for booking with TicketBooking!</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "TicketBooking <noreply@ticketbooking.com>",
      to: data.to,
      subject: `🎬 Booking Confirmed - ${data.eventTitle} | Ref: ${data.bookingRef}`,
      html: htmlContent,
      attachments: [
        {
          filename: "ticket-qrcode.png",
          content: qrBuffer,
          cid: "qrcode",
        },
      ],
    });

    console.log(`✅ Booking email sent to ${data.to} for ref ${data.bookingRef}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send booking email:", error);
    return false;
  }
}

interface WaitlistOfferEmailData {
  to: string;
  customerName: string;
  eventTitle: string;
  categoryName: string;
  offerToken: string;
  expiresAt: string;
}

/**
 * Send waitlist offer notification email with time-limited booking link.
 */
export async function sendWaitlistOfferEmail(
  data: WaitlistOfferEmailData
): Promise<boolean> {
  try {
    const bookingLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/waitlist/claim/${data.offerToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 32px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .body { padding: 32px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 16px 0; color: #856404; }
          .footer { text-align: center; padding: 24px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 A Seat is Available!</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${data.customerName}</strong>,</p>
            <p>Great news! A <strong>${data.categoryName}</strong> seat has become available for <strong>${data.eventTitle}</strong>.</p>
            
            <div class="warning">
              ⏰ <strong>This offer expires at ${data.expiresAt}</strong>. If you don't complete the booking in time, the seat will be offered to the next person on the waitlist.
            </div>
            
            <div style="text-align: center;">
              <a href="${bookingLink}" class="cta-button">Book Now →</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email from TicketBooking.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "TicketBooking <noreply@ticketbooking.com>",
      to: data.to,
      subject: `🎉 Seat Available - ${data.eventTitle} | Act Now!`,
      html: htmlContent,
    });

    console.log(`✅ Waitlist offer email sent to ${data.to}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send waitlist offer email:", error);
    return false;
  }
}
