import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

# Load root .env
root_env = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=str(root_env), override=True)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "noreply@retailecosystem.com")

def send_email_otp(to_email: str, otp_code: str) -> tuple[bool, str]:
    """
    Delivers a 6-digit verification OTP code to the user's Google/Gmail inbox via SMTP TLS.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, "Gmail SMTP credentials (SMTP_USER / SMTP_PASSWORD) not configured in .env."

    subject = f"🔐 Your 6-Digit Login Verification Code: {otp_code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }}
        .container {{ max-width: 500px; background: #ffffff; margin: 0 auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }}
        .header {{ text-align: center; border-bottom: 2px solid #eef2f6; padding-bottom: 20px; }}
        .title {{ color: #1e293b; font-size: 22px; font-weight: 700; margin: 0; }}
        .otp-box {{ background: #f1f5f9; border: 2px dashed #0284c7; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0; }}
        .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0284c7; margin: 0; }}
        .footer {{ font-size: 13px; color: #64748b; text-align: center; margin-top: 25px; border-top: 1px solid #eef2f6; padding-top: 15px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 class="title">Retail Ecosystem Login</h2>
        </div>
        <p style="color: #475569; font-size: 15px;">Use the following 6-digit verification code to complete your login:</p>
        <div class="otp-box">
          <h1 class="otp-code">{otp_code}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>5 minutes</strong>. For your security, do NOT share this code with anyone.</p>
        <div class="footer">
          <p>© 2026 Retail Ecosystem. Secured with HTTP-Only Cookie Authentication.</p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email

    msg.attach(MIMEText(f"Your verification code is: {otp_code}", "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        return True, "Email OTP sent successfully via Gmail SMTP!"
    except Exception as e:
        return False, f"Failed to deliver Email OTP via SMTP: {str(e)}"
