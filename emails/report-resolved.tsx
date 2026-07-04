interface ReportResolvedEmailProps {
  citizenName: string;
  reportTitle: string;
  reportId: string;
}

export function ReportResolvedEmail({ citizenName, reportTitle, reportId }: ReportResolvedEmailProps) {
  return (
    <div>
      <p>Hi {citizenName},</p>
      <p>
        Your road incident report <strong>"{reportTitle}"</strong> has been
        marked as <strong>resolved</strong>.
      </p>
      <p>
        The reported issue has been addressed. Thank you for bringing it to
        attention — your report helped make the road safer for everyone.
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
    </div>
  );
}
