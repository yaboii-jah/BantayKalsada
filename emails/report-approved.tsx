interface ReportApprovedEmailProps {
  citizenName: string;
  reportTitle: string;
  reportId: string;
}

export function ReportApprovedEmail({ citizenName, reportTitle, reportId }: ReportApprovedEmailProps) {
  return (
    <div>
      <p>Hi {citizenName},</p>
      <p>
        Your road incident report <strong>"{reportTitle}"</strong> has been
        reviewed and <strong>approved</strong>.
      </p>
      <p>
        It is now visible on the public feed so fellow motorists and pedestrians
        can be aware of the hazard.
      </p>
      <p style={{ margin: "24px 0" }}>
        <a
          href={`https://bantay-kalsada.vercel.app/reports/${reportId}`}
          style={{
            display: "inline-block",
            padding: "10px 20px",
            backgroundColor: "#1D4ED8",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          View Report
        </a>
      </p>
      <p style={{ color: "#64748B", fontSize: 13 }}>
        Thank you for helping keep our roads safe.
      </p>
    </div>
  );
}
