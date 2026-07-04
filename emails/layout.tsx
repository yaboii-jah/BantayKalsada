import type { ReactNode } from "react";

interface EmailLayoutProps {
  children: ReactNode;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f4f4f5" }}>
        <table
          align="center"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ maxWidth: 600, margin: "0 auto", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 14, lineHeight: 1.5, color: "#0F172A" }}
        >
          <tr>
            <td style={{ padding: "24px 24px 0" }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1D4ED8", margin: 0 }}>
                Bantay Kalsada
              </h1>
            </td>
          </tr>
          <tr>
            <td style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 32, margin: "16px 16px 0" }}>
              {children}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: 12 }}>
              <p style={{ margin: 0 }}>
                Bantay Kalsada — Community Road Incident Reporting
              </p>
              <p style={{ margin: "4px 0 0" }}>
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
