import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { 
  Home, 
  Search, 
  ShoppingBag, 
  User, 
  MessageCircle, 
  Instagram, 
  Plus, 
  X, 
  Bot, 
  Sparkles, 
  Send, 
  Loader2 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useAdminStatus } from "@/lib/useAdmin";
import { useState, useRef, useEffect } from "react";

function MobileNav() {
  const [location] = useLocation();
  const cartItemsCount = useCart((state) => state.getTotalItems());

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/products", icon: Search, label: "Shop" },
    { href: "/cart", icon: ShoppingBag, label: "Cart", badge: cartItemsCount },
    { href: "/account", icon: User, label: "Account" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur-lg z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// FLOATING SOCIAL BUTTON (Bottom Right)
// ----------------------------------------------------
function FloatingSocialMenu({ 
  whatsappNumber, 
  instagramUrl 
}: { 
  whatsappNumber?: string; 
  instagramUrl?: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Clean phone number or use standard default
  const cleanPhone = whatsappNumber ? whatsappNumber.replace(/\s+/g, "").replace(/[+]/g, "") : "919301103485";
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hi, I need help with my order")}`;
  const finalInstagramUrl = instagramUrl || "https://www.instagram.com/shoplux.in?igsh=Yzh5MzZkMWV4ZHM0";

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      {/* Sub-buttons list container with expand animation */}
      <div 
        className={`flex flex-col items-center gap-3 transition-all duration-300 origin-bottom ${
          isOpen 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-4 scale-75 pointer-events-none"
        }`}
      >
        {/* Instagram button */}
        <a
          href={finalInstagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative group"
          aria-label="Follow us on Instagram"
        >
          <Instagram className="w-5 h-5 md:w-5.5 md:h-5.5" />
          <span className="absolute right-14 bg-background text-foreground text-xs px-2.5 py-1 rounded-md border shadow-md font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Instagram
          </span>
        </a>

        {/* WhatsApp button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 h-11 md:w-12 md:h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative group"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 md:w-5.5 md:h-5.5" />
          <span className="absolute right-14 bg-background text-foreground text-xs px-2.5 py-1 rounded-md border shadow-md font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            WhatsApp Chat
          </span>
        </a>
      </div>

      {/* Main trigger FAB button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 active:scale-95 bg-primary text-primary-foreground ${
          isOpen ? "bg-muted-foreground rotate-45" : "bg-primary"
        }`}
        aria-label="Toggle contact menu"
      >
        <Plus className="w-6 h-6 md:w-7 md:h-7" />
      </button>
    </div>
  );
}

// ----------------------------------------------------
// AI CHATBOT WIDGET (Bottom Left)
// ----------------------------------------------------
function ChatbotWidget({ storeName }: { storeName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I am your premium AI Shopping Assistant at **${storeName}**. How may I elevate your shopping journey today? ✨`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const quickQuestions = [
    "🛍️ Recommend products",
    "🚚 Shipping & charges",
    "🔄 Return policy",
    "📦 Order status",
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: "user" as const, content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) throw new Error("Failed to chat");
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error connecting to our system. Please write to us or try again in a few moments.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 md:bottom-6 left-6 z-40 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white p-3 md:p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-115 active:scale-95 flex items-center justify-center cursor-pointer hover:rotate-12 group"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Polish Chat Widget Box */}
      {isOpen && (
        <div className="fixed bottom-32 md:bottom-24 left-6 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 stroke-[2.5]" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">{storeName} Assistant</h3>
                <span className="text-[10px] opacity-85 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online & Active
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20"
          >
            {messages.map((m, index) => {
              const isUser = m.role === "user";
              return (
                <div 
                  key={index}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isUser 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-background text-foreground border rounded-bl-none prose prose-sm prose-neutral"
                    }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-background text-foreground border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 shadow-sm text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  Assistant is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Quick Option Tags */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-muted/40 border-t flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q.slice(3))}
                  className="text-[11px] font-medium border bg-background hover:bg-accent text-foreground px-2 py-1 rounded-full transition-colors active:scale-95 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 border-t bg-background flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-muted/50 border rounded-full px-4 py-2 text-xs focus:outline-none focus:border-primary focus:bg-background transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { whatsappNumber, instagramUrl, isChatbotEnabled, storeName } = useAdminStatus();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden relative">
      <Navbar />
      <main className="flex-1 flex flex-col w-full pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />

      {/* Floating social menu in bottom-right corner */}
      <FloatingSocialMenu 
        whatsappNumber={whatsappNumber} 
        instagramUrl={instagramUrl} 
      />

      {/* AI customer chatbot widget in bottom-left corner */}
      {isChatbotEnabled && (
        <ChatbotWidget storeName={storeName} />
      )}
    </div>
  );
}
