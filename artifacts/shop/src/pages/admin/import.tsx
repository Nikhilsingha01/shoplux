import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface ImportResultRow {
  row: number;
  name: string;
  status: "success" | "error";
  error?: string;
}

export default function AdminImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{
    successCount: number;
    errorCount: number;
    rows: ImportResultRow[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a valid CSV file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsUploading(true);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/products/bulk-import", {
        method: "POST",
        headers: {
          "x-admin-token": adminToken,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import CSV");
      }

      const data = await res.json();
      setResults(data);
      if (data.errorCount > 0) {
        toast.warning(`Import completed with ${data.errorCount} errors.`);
      } else {
        toast.success(`Successfully imported all ${data.successCount} products!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AdminLayout title="CSV Bulk Importer">
      <div className="space-y-8 max-w-5xl">
        {/* Importer Section */}
        <section className="bg-background border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg border-b pb-3 mb-4">Bulk Import Products</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a CSV file containing your product details to quickly import them in bulk.
          </p>
          
          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Drop Box */}
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 rounded-xl flex flex-col items-center justify-center bg-muted/10 relative group">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="p-3 bg-primary/10 text-primary rounded-full mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">
                {file ? file.name : "Click to select or drag and drop your CSV file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV files up to 5MB"}
              </p>
            </div>

            {/* Template Info */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-3 text-xs md:text-sm text-blue-800 dark:text-blue-300">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1">
                <span className="font-semibold">CSV Column Formatting Guidelines:</span>
                <p>Ensure your CSV headers match the following fields (case-insensitive):</p>
                <div className="flex flex-wrap gap-2 mt-2 font-mono text-[10px] md:text-xs">
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">name *</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">price *</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">stock</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">description</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">comparePrice</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">category</span>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 border">images</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  * Required fields. Multiple images can be separated by commas. If the category does not exist, it will be automatically created.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  className="rounded-none tracking-wide"
                >
                  Clear Selection
                </Button>
              )}
              <Button
                type="submit"
                disabled={!file || isUploading}
                className="rounded-none tracking-wide font-medium min-w-[120px]"
              >
                {isUploading ? "Uploading..." : "Start Import"}
              </Button>
            </div>
          </form>
        </section>

        {/* Results Section */}
        {results && (
          <section className="bg-background border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="font-semibold text-lg">Import Results</h2>
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {results.successCount} Succeeded
                </span>
                {results.errorCount > 0 && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {results.errorCount} Failed
                  </span>
                )}
              </div>
            </div>

            {/* Results Table */}
            <div className="border border-border overflow-hidden rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted border-b text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                    <th className="px-4 py-3 w-16">Row</th>
                    <th className="px-4 py-3 w-1/3">Product Name</th>
                    <th className="px-4 py-3 w-24">Status</th>
                    <th className="px-4 py-3">Error / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.rows.map((row) => (
                    <tr
                      key={row.row}
                      className={row.status === "error" ? "bg-red-50/20 dark:bg-red-950/5" : ""}
                    >
                      <td className="px-4 py-3 font-semibold text-muted-foreground">{row.row}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            row.status === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {row.status === "success" ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Product created successfully
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
