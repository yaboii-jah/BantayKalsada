function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5">
<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:14;line-height:1.5;color:#0F172A">
<tr><td style="padding:24px 24px 0"><h1 style="font-size:18;font-weight:700;color:#1D4ED8;margin:0">Bantay Kalsada</h1></td></tr>
<tr><td style="background-color:#FFFFFF;border-radius:8px;padding:32px;margin:16px 16px 0">${content}</td></tr>
<tr><td style="padding:24px;text-align:center;color:#64748B;font-size:12px"><p style="margin:0">Bantay Kalsada — Community Road Incident Reporting</p><p style="margin:4px 0 0">This is an automated notification. Please do not reply to this email.</p></td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:10px 20px;background-color:#1D4ED8;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px">${label}</a>`;
}

export function renderApprovedEmail(citizenName: string, reportTitle: string, reportId: string): string {
  const content = `
<p>Hi ${citizenName},</p>
<p>Your road incident report <strong>"${reportTitle}"</strong> has been reviewed and <strong>approved</strong>.</p>
<p>It is now visible on the public feed so fellow motorists and pedestrians can be aware of the hazard.</p>
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/reports/${reportId}`, "View Report")}</p>
<p style="color:#64748B;font-size:13px">Thank you for helping keep our roads safe.</p>`;
  return baseLayout(content);
}

export function renderRejectedEmail(citizenName: string, reportTitle: string, reportId: string, rejectionReason: string): string {
  const content = `
<p>Hi ${citizenName},</p>
<p>Your road incident report <strong>"${reportTitle}"</strong> has been reviewed and <strong>rejected</strong>.</p>
<p><strong>Reason:</strong></p>
<div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:12px;color:#991B1B;font-size:13px">${rejectionReason}</div>
<p style="color:#64748B;font-size:13px">You may submit a new report with additional information or supporting evidence.</p>
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/my-reports/${reportId}`, "View Details")}</p>`;
  return baseLayout(content);
}

export function renderResolvedEmail(citizenName: string, reportTitle: string, reportId: string, resolutionNotes?: string): string {
  const notesHtml = resolutionNotes
    ? `<div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:12px;color:#1E40AF;font-size:13px;margin:16px 0">${resolutionNotes}</div>`
    : "";
  const content = `
<p>Hi ${citizenName},</p>
<p>Your road incident report <strong>"${reportTitle}"</strong> has been marked as <strong>resolved</strong>.</p>
<p>The reported issue has been addressed. Thank you for bringing it to attention — your report helped make the road safer for everyone.</p>${notesHtml}
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/reports/${reportId}`, "View Report")}</p>`;
  return baseLayout(content);
}

export function renderFeedbackAcknowledgedEmail(citizenName: string, feedbackTitle: string, feedbackId: string): string {
  const content = `
<p>Hi ${citizenName},</p>
<p>Your feedback <strong>"${feedbackTitle}"</strong> has been reviewed and <strong>acknowledged</strong>.</p>
<p>Thank you for taking the time to help us improve Bantay Kalsada. Your input has been noted by our team.</p>
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/my-feedback/${feedbackId}`, "View Feedback")}</p>
<p style="color:#64748B;font-size:13px">We appreciate your contribution to making the app better for everyone.</p>`;
  return baseLayout(content);
}

export function renderFeedbackNoteAddedEmail(
  citizenName: string,
  feedbackTitle: string,
  feedbackId: string,
  adminNote: string,
): string {
  const content = `
<p>Hi ${citizenName},</p>
<p>An admin has added a note to your feedback <strong>"${feedbackTitle}"</strong>:</p>
<div style="background-color:#F4F4F5;border:1px solid #E4E4E7;border-radius:6px;padding:12px;color:#0F172A;font-size:13px">${adminNote}</div>
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/my-feedback/${feedbackId}`, "View Feedback")}</p>
<p style="color:#64748B;font-size:13px">Thank you for helping us improve Bantay Kalsada.</p>`;
  return baseLayout(content);
}

export function renderFeedbackClosedEmail(citizenName: string, feedbackTitle: string, feedbackId: string): string {
  const content = `
<p>Hi ${citizenName},</p>
<p>Your feedback <strong>"${feedbackTitle}"</strong> has been <strong>closed</strong>.</p>
<p>The issue you raised has been reviewed and addressed by our team.</p>
<p style="margin:24px 0">${button(`${process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"}/my-feedback/${feedbackId}`, "View Feedback")}</p>
<p style="color:#64748B;font-size:13px">Thank you for helping us improve Bantay Kalsada.</p>`;
  return baseLayout(content);
}
