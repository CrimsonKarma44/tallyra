const APP_NAME = "Tallyra — POS Transaction Book";

function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3eee4;font-family:Arial,Helvetica,sans-serif;color:#1b2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffdf8;border:1px solid #d8cfc0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1b2430;color:#f7f2ea;padding:18px 28px;">
                <div style="font-weight:bold;font-size:16px;letter-spacing:0.04em;">${APP_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#1b2430;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #d8cfc0;color:#7a7166;font-size:12px;">
                If you didn't request this email, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function otpBlock(code: string, minutes: number): string {
  return `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Use this code to continue. It expires in <strong>${minutes} minutes</strong>.</p>
    <div style="background:#d8efe9;border-radius:8px;padding:18px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:8px;color:#073f37;">${code}</div>
    <p style="margin:16px 0 0;font-size:13px;color:#7a7166;">For security, this code can only be used once.</p>`;
}

export function passwordResetEmail(opts: { username: string; code: string; expiresInMinutes: number }) {
  const subject = "Reset your Tallyra password";
  const text = `Hi ${opts.username},\n\nYour password reset code is ${opts.code}. It expires in ${opts.expiresInMinutes} minutes and can only be used once.\n\nIf you didn't request this, you can ignore this email.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hi ${opts.username}, we received a request to reset your password.</p>${otpBlock(opts.code, opts.expiresInMinutes)}`,
  );
  return { subject, text, html };
}

export function verifyEmailEmail(opts: { username: string; code: string; expiresInMinutes: number }) {
  const subject = "Verify your email";
  const text = `Hi ${opts.username},\n\nYour verification code is ${opts.code}. It expires in ${opts.expiresInMinutes} minutes and can only be used once.\n\nIf you didn't create an account, you can ignore this email.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hi ${opts.username}, confirm your email to finish setting up your account.</p>${otpBlock(opts.code, opts.expiresInMinutes)}`,
  );
  return { subject, text, html };
}

export function verifyOrgEmailEmail(opts: { orgName: string; code: string; expiresInMinutes: number }) {
  const subject = `Verify ${opts.orgName} email`;
  const text = `Verify the email address for ${opts.orgName}.\n\nYour verification code is ${opts.code}. It expires in ${opts.expiresInMinutes} minutes and can only be used once.\n\nIf you didn't create this organization, you can ignore this email.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Confirm this address to activate member invites and alerts for <strong>${opts.orgName}</strong>.</p>${otpBlock(opts.code, opts.expiresInMinutes)}`,
  );
  return { subject, text, html };
}

export function newMemberAlertEmail(opts: { orgName: string; memberUsername: string; addedBy: string }) {
  const subject = `New member added to ${opts.orgName}`;
  const text = `${opts.memberUsername} was added to ${opts.orgName} by ${opts.addedBy}.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;">A new member was added to your organization ledger.</p>
     <p style="margin:0 0 4px;font-size:14px;">Username: <strong>${opts.memberUsername}</strong></p>
     <p style="margin:0;font-size:14px;">Added by: ${opts.addedBy}</p>`,
  );
  return { subject, text, html };
}

export function memberLoginAlertEmail(opts: { orgName: string; username: string; at: string }) {
  const subject = `Member signed in to ${opts.orgName}`;
  const text = `${opts.username} signed in to ${opts.orgName} at ${opts.at}.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;">A member just signed in to your organization.</p>
     <p style="margin:0 0 4px;font-size:14px;">Username: <strong>${opts.username}</strong></p>
     <p style="margin:0;font-size:14px;">Time: ${opts.at}</p>`,
  );
  return { subject, text, html };
}

export function accountDeletionRequestEmail(opts: {
  orgName: string;
  memberUsername: string;
  reason?: string;
}) {
  const subject = `Account deletion request in ${opts.orgName}`;
  const reasonLine = opts.reason
    ? `\n     <p style="margin:0 0 4px;font-size:14px;">Reason: ${opts.reason}</p>`
    : "";
  const text = `${opts.memberUsername} requested to delete their account in ${opts.orgName}. Sign in and open the Organization page to approve or dismiss the request.`;
  const html = emailLayout(
    subject,
    `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;">A member asked to delete their account.</p>
     <p style="margin:0 0 4px;font-size:14px;">Username: <strong>${opts.memberUsername}</strong></p>${reasonLine}
     <p style="margin:12px 0 0;font-size:14px;">Sign in and open the <strong>Organization</strong> page to approve or dismiss the request.</p>`,
  );
  return { subject, text, html };
}