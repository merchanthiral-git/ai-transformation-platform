"""Email service for AI Transformation Platform — powered by Resend.

Setup:
  1. Sign up at https://resend.com (free: 100 emails/day)
  2. Add & verify your domain OR use the free onboarding sender
  3. Create an API key at https://resend.com/api-keys
  4. Set the env var:  export RESEND_API_KEY="re_xxxxxxxxx"

Until you verify a custom domain, Resend lets you send FROM
  "onboarding@resend.dev" — fine for testing.
Once verified, change SENDER_EMAIL below to your real address.
"""

import os
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger("email_service")

# ── Config ─────────────────────────────────────────────────────
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_NAME = "Hiral Merchant"
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")  # Change after domain verification
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "merchanthiral@gmail.com")
APP_NAME = "AI Transformation Platform"
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")

SENDER = f"{SENDER_NAME} <{SENDER_EMAIL}>"


def _is_configured() -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — emails will be skipped (logged only).")
        return False
    return True


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API. Returns True on success."""
    if not _is_configured():
        logger.info(f"[EMAIL SKIPPED] To: {to} | Subject: {subject}")
        logger.debug(f"[EMAIL BODY]\n{html[:500]}")
        return False

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": SENDER,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
            if resp.status_code in (200, 201):
                logger.info(f"[EMAIL SENT] To: {to} | Subject: {subject}")
                return True
            else:
                logger.error(f"[EMAIL FAILED] {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"[EMAIL ERROR] {e}")
        return False


# ── Branded HTML wrapper ───────────────────────────────────────
def _wrap_html(body_content: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#0a0805;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:24px;font-weight:700;color:#f5e6d0;letter-spacing:-0.5px;">AI Transformation</div>
          <div style="font-size:10px;color:rgba(224,144,64,0.85);letter-spacing:5px;text-transform:uppercase;margin-top:4px;">Platform</div>
        </div>

        <!-- Card -->
        <div style="background:rgba(15,12,8,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px 28px;">
          {body_content}
        </div>

        <!-- Footer -->
        <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">
            {APP_NAME}<br>
            Hiral Merchant · Consultant · New York
          </div>
        </div>
      </div>
    </body>
    </html>
    """


# ═══════════════════════════════════════════════════════════════
# EMAIL TEMPLATES
# ═══════════════════════════════════════════════════════════════

async def send_welcome_email(to_email: str, username: str, verification_token: str) -> bool:
    """Send welcome + email verification to new user."""
    verify_url = f"{APP_URL}/api/auth/verify-email?token={verification_token}"

    body = f"""
    <div style="font-size:20px;font-weight:700;color:#f5e6d0;margin-bottom:8px;">Welcome, {username}!</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:24px;line-height:1.6;">
      Thank you from the bottom of my heart for joining the AI Transformation Platform.
      I built this tool to help consultants and organizations navigate the complex
      journey of workforce transformation — and I'm thrilled you're here.
    </div>

    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px;line-height:1.6;">
      Please confirm your email address to get started:
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="{verify_url}" style="display:inline-block;padding:14px 36px;border-radius:12px;background:linear-gradient(135deg,#e09040,#c07030);color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(224,144,64,0.3);">
        Verify My Email
      </a>
    </div>

    <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:24px;line-height:1.5;">
      If the button doesn't work, copy this link:<br>
      <span style="color:rgba(224,144,64,0.6);word-break:break-all;">{verify_url}</span>
    </div>

    <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;">
        Warm regards,<br>
        <span style="color:#e09040;font-weight:600;">Hiral Merchant</span><br>
        <span style="font-size:11px;color:rgba(255,255,255,0.3);">Consultant · New York</span>
      </div>
    </div>
    """
    return await _send_email(to_email, f"Welcome to {APP_NAME} — Please verify your email", _wrap_html(body))


async def send_admin_new_user_notification(username: str, email: str | None) -> bool:
    """Notify admin (you) that a new user signed up."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    body = f"""
    <div style="font-size:16px;font-weight:700;color:#f5e6d0;margin-bottom:16px;">🎉 New User Signed Up</div>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;width:100px;">Username</td>
        <td style="padding:8px 0;font-size:14px;color:#f5e6d0;font-weight:600;">{username}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Email</td>
        <td style="padding:8px 0;font-size:14px;color:#f5e6d0;">{email or '(not provided)'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Signed Up</td>
        <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.5);">{now}</td>
      </tr>
    </table>
    """
    return await _send_email(ADMIN_EMAIL, f"[{APP_NAME}] New user: {username}", _wrap_html(body))


async def send_password_reset_email(to_email: str, username: str, reset_token: str) -> bool:
    """Send password reset token to user."""
    body = f"""
    <div style="font-size:18px;font-weight:700;color:#f5e6d0;margin-bottom:8px;">Password Reset</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px;line-height:1.6;">
      Hi {username}, we received a request to reset your password. Use the token below:
    </div>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:16px 32px;border-radius:12px;background:rgba(224,144,64,0.12);border:1px solid rgba(224,144,64,0.25);">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Reset Token</div>
        <div style="font-size:22px;font-weight:700;color:#e09040;letter-spacing:2px;font-family:monospace;">{reset_token}</div>
      </div>
    </div>

    <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:20px;line-height:1.5;">
      This token expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </div>
    """
    return await _send_email(to_email, f"[{APP_NAME}] Password Reset Token", _wrap_html(body))


async def send_email_verified_confirmation(to_email: str, username: str) -> bool:
    """Send confirmation that email has been verified."""
    body = f"""
    <div style="text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">✅</div>
      <div style="font-size:18px;font-weight:700;color:#f5e6d0;margin-bottom:8px;">Email Verified!</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:24px;line-height:1.6;">
        Thanks {username}! Your email is now verified. You're all set to use the full
        AI Transformation Platform.
      </div>
      <a href="{APP_URL}" style="display:inline-block;padding:14px 36px;border-radius:12px;background:linear-gradient(135deg,#e09040,#c07030);color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
        Open Platform
      </a>
    </div>
    """
    return await _send_email(to_email, f"[{APP_NAME}] Email Verified ✓", _wrap_html(body))


async def send_project_created_notification(username: str, project_name: str, industry: str = "", size: str = "") -> bool:
    """Notify admin that a user created a new project."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    body = f"""
    <div style="font-size:16px;font-weight:700;color:#f5e6d0;margin-bottom:16px;">📊 New Project Created</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;width:100px;">Project</td><td style="padding:8px 0;font-size:14px;color:#f5e6d0;font-weight:600;">{project_name}</td></tr>
      <tr><td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Created By</td><td style="padding:8px 0;font-size:14px;color:#f5e6d0;">{username}</td></tr>
      {f'<tr><td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Industry</td><td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.5);">{industry}</td></tr>' if industry else ''}
      <tr><td style="padding:8px 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Created</td><td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.5);">{now}</td></tr>
    </table>
    """
    return await _send_email(ADMIN_EMAIL, f"[{APP_NAME}] New project: {project_name} by {username}", _wrap_html(body))
