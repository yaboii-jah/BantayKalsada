interface ReportRejectedEmailProps {
  citizenName: string;
  reportTitle: string;
  reportId: string;
  rejectionReason: string;
}

export function ReportRejectedEmail({ citizenName, reportTitle, reportId, rejectionReason }: ReportRejectedEmailProps) {
  return (
    <div>
      <p>Hi {citizenName},</p>
      <p>
        Your road incident report <strong>"{reportTitle}"</strong> has been
        reviewed and <strong>rejected</strong>.
      </p>
      <p><strong>Reason:</strong></p>
      <p style={{
        backgroundColor: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 6,
        padding: 12,
        color: "#991B1B",
        fontSize: 13,
      }}>
        {rejectionReason}
      </p>
      <p style={{ color: "#64748B", fontSize: 13 }}>
        You may submit a new report with additional information or supporting
        evidence.
      </p>
      <p style={{ margin: "24px 0" }}>
        <a
          href={`https://bantay-kalsada.vercel.app/my-reports/${reportId}`}
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
          View Details
        </a>
      </p>
    </div>
  );
}
