import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { MessageCircle, Mail, Clock, CheckCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read";
  created_at: string;
}

export default function AdminSupport() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportMessage | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/admin/support", {
        headers: { "x-admin-token": "shopluxadmin" },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      toast.error("Failed to load support messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id: number) => {
    try {
      await fetch(`/api/admin/support/${id}/read`, {
        method: "PATCH",
        headers: { "x-admin-token": "shopluxadmin" },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "read" as const } : m))
      );
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: "read" } : s);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-serif">Customer Support</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}` : "All messages read"}
            </p>
          </div>
          <Button variant="outline" onClick={fetchMessages} className="rounded-sm">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-24 border rounded-sm">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No support messages yet</p>
            <p className="text-muted-foreground text-sm mt-1">Messages from customers will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message List */}
            <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => { setSelected(msg); if (msg.status === "unread") markRead(msg.id); }}
                  className={`cursor-pointer border rounded-sm p-4 transition-colors hover:border-amber-400 ${
                    selected?.id === msg.id ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" : ""
                  } ${msg.status === "unread" ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-sm">{msg.name}</span>
                      {msg.status === "unread" && (
                        <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(msg.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="border rounded-sm">
              {selected ? (
                <div className="p-6 h-full flex flex-col">
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h2 className="font-bold text-lg">{selected.subject}</h2>
                      {selected.status === "unread" && (
                        <Button size="sm" variant="outline" className="rounded-sm flex-shrink-0" onClick={() => markRead(selected.id)}>
                          <CheckCheck className="w-4 h-4 mr-1" /> Mark Read
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium text-foreground">{selected.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${selected.email}`} className="text-amber-600 hover:underline">{selected.email}</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(selected.created_at).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 border-t pt-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{selected.message}</p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <a
                      href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                      className="inline-flex items-center gap-2 text-sm text-amber-600 font-semibold hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      Reply via Email
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Select a message to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
