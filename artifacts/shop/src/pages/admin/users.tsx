import { useListUsers } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminUsers() {
  const { data: usersData, isLoading } = useListUsers({ limit: 100 });

  return (
    <AdminLayout title="Users">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{usersData?.total ?? 0} customers</p>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                  ))
                : usersData?.users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {(user.fullName || user.email || "?")[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{user.fullName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.phone || "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && !usersData?.users.length && (
            <div className="text-center py-16 text-muted-foreground">No users yet.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
