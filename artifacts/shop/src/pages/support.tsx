import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Mail, Clock, CheckCircle2 } from "lucide-react";

export default function Support() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setSubmitted(true);
      toast.success("Message sent! We'll get back to you within 24 hours.");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
            <MessageCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-3">Contact Support</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Have a question or issue? We're here to help. Fill out the form below and our team will get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="border p-5 rounded-sm">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-sm">Email Us</span>
              </div>
              <p className="text-sm text-muted-foreground">support@shoplux.in</p>
            </div>
            <div className="border p-5 rounded-sm">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-sm">Response Time</span>
              </div>
              <p className="text-sm text-muted-foreground">Within 24 hours on business days</p>
            </div>
            <div className="border p-5 rounded-sm bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Tip</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">For order-related issues, include your Order ID in the subject for faster resolution.</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-sm bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="w-14 h-14 text-green-600 mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Message Sent!</h2>
                <p className="text-muted-foreground mb-6">We've received your message and will respond within 24 hours.</p>
                <Button variant="outline" className="rounded-none" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 border p-8 rounded-sm shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="support-name">Your Name *</Label>
                    <Input
                      id="support-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Full name"
                      required
                      className="rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Email Address *</Label>
                    <Input
                      id="support-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      className="rounded-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-subject">Subject *</Label>
                  <select
                    id="support-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-3 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a topic</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Payment Problem">Payment Problem</option>
                    <option value="Return / Refund">Return / Refund</option>
                    <option value="Delivery Delay">Delivery Delay</option>
                    <option value="Product Question">Product Question</option>
                    <option value="Account Help">Account Help</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-message">Message *</Label>
                  <Textarea
                    id="support-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Describe your issue or question in detail..."
                    rows={6}
                    required
                    className="rounded-sm resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
                >
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
