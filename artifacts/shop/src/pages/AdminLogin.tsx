import { useState } from "react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ADMIN_EMAIL = "singhalnikhil010@gmail.com";
  const ADMIN_PASSWORD = "shopluxadmin";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      email === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("adminEmail", email);
      localStorage.setItem("adminToken", password);

      navigate("/admin/dashboard");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2">
          Admin Login
        </h1>

        <p className="text-muted-foreground mb-6">
          Access ShopLux admin dashboard
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full border rounded-lg px-4 py-3 mt-1"
              placeholder="Enter admin email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full border rounded-lg px-4 py-3 mt-1"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg font-medium"
          >
            Login
          </button>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => window.location.href = "/"}
              className="w-full border rounded-lg py-3 font-medium hover:bg-gray-100 transition"
            >
              ← Back to Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}