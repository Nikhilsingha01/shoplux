import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, Eye, X } from "lucide-react";

interface DebugEmail {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  html: string;
  context: string;
  redirectedTo: string | null;
  status: string;
}

export default function AdminEmails() {
  const [selectedEmail, setSelectedEmail] = useState<DebugEmail | null>(null);

  const { data: emails = [], isLoading, refetch, isFetching } = useQuery<DebugEmail[]>({
    queryKey: ["admin", "debug-emails"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const finalToken = (adminToken && adminToken !== "null" && adminToken !== "undefined") ? adminToken : "shopluxadmin";
      const res = await fetch("/api/admin/debug-emails", {
        headers: { "x-admin-token": finalToken },
      });
      if (!res.ok) throw new Error("Failed to load debug emails");
      return res.json();
    },
  });

  return (
    <AdminLayout title="Outbound Emails Log">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            View generated outbound emails in real-time (last 50 emails)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Original Recipient</th>
                <th className="px-6 py-3 font-medium">Subject</th>
                <th className="px-6 py-3 font-medium">Delivery Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                : emails.map((email) => {
                    const isRedirected = !!email.redirectedTo;
                    const displayStatus = isRedirected ? "Redirected (Sandbox)" : email.status;
                    const statusBadgeClass =
                      email.status === "triggered"
                        ? isRedirected
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-green-100 text-green-800 border-green-200"
                        : "bg-yellow-100 text-yellow-800 border-yellow-200";

                    return (
                      <tr key={email.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(email.timestamp).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs px-2.5 py-1 rounded-md bg-secondary font-mono">
                            {email.context}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{email.to}</span>
                            {isRedirected && (
                              <span className="text-[11px] text-amber-600 font-semibold mt-0.5">
                                → Sent to: {email.redirectedTo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground max-w-[200px] truncate">
                          {email.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusBadgeClass}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEmail(email)}
                            className="text-primary hover:text-primary/95 flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!isLoading && !emails.length && (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Mail className="w-10 h-10 text-muted" />
              <p>No outbound emails logged yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-serif font-bold text-lg">{selectedEmail.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    To: {selectedEmail.to} | Type: {selectedEmail.context}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEmail(null)}
                className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Email Metadata Details */}
            <div className="px-6 py-3 bg-muted/10 border-b text-xs flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
              <div>
                <strong>Generated At:</strong>{" "}
                {new Date(selectedEmail.timestamp).toLocaleString("en-IN")}
              </div>
              {selectedEmail.redirectedTo && (
                <div className="text-amber-600 font-semibold">
                  <strong>Sandbox Redirect:</strong> {selectedEmail.redirectedTo}
                </div>
              )}
              <div>
                <strong>Engine Status:</strong> {selectedEmail.status}
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-[#f5f4f0] p-4 overflow-hidden">
              <iframe
                title="Email Preview"
                srcDoc={selectedEmail.html}
                className="w-full h-full border rounded bg-white shadow-inner"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
