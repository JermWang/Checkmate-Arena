import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Shield, AlertTriangle, CheckCircle, XCircle, Ban, Activity, Eye } from "lucide-react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"flags" | "actions">("flags");

  const { data: flags, isLoading: flagsLoading } = trpc.admin.flags.useQuery(
    { status: "open" },
    { enabled: !!user }
  );

  const { data: actions } = trpc.admin.actions.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  const utils = trpc.useUtils();
  const resolveFlag = trpc.admin.resolveFlag.useMutation({
    onSuccess: () => utils.admin.flags.invalidate(),
  });
  const banPlayer = trpc.admin.banPlayer.useMutation();
  trpc.admin.voidMatch.useMutation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="w-8 h-8 border-2 border-[#E6B84F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Only allow admin users
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center pt-16">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-[#8A8F98]">Admin access only.</p>
        </div>
      </div>
    );
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/10";
      case "high": return "text-orange-500 bg-orange-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      default: return "text-blue-500 bg-blue-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-[#E6B84F]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-[#8A8F98]">Manage flags, review players, monitor activity</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <AdminStat label="Open Flags" value={flags?.length ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="text-yellow-400" />
          <AdminStat label="Critical" value={flags?.filter((f) => f.severity === "critical").length ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="text-red-400" />
          <AdminStat label="Reviewed" value={actions?.filter((a) => a.actionType === "resolve_flag").length ?? 0} icon={<CheckCircle className="w-5 h-5" />} color="text-[#E6B84F]" />
          <AdminStat label="Total Actions" value={actions?.length ?? 0} icon={<Activity className="w-5 h-5" />} color="text-blue-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("flags")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "flags" ? "bg-[#E6B84F] text-black" : "border border-white/10 text-[#8A8F98] hover:border-white/20"
            }`}
          >
            Flagged Players
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === "actions" ? "bg-[#E6B84F] text-black" : "border border-white/10 text-[#8A8F98] hover:border-white/20"
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Flags Tab */}
        {activeTab === "flags" && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-[120px_1fr_150px_100px_120px] gap-4 px-6 py-3 bg-white/[0.03] text-xs text-[#8A8F98] uppercase tracking-wider">
              <span>Wallet</span>
              <span>Reason</span>
              <span>Severity</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {flagsLoading ? (
              <div className="px-6 py-8 text-center text-[#8A8F98]">
                <div className="w-6 h-6 border-2 border-[#E6B84F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading flags...
              </div>
            ) : flags && flags.length > 0 ? (
              <div className="divide-y divide-white/5">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="grid grid-cols-[120px_1fr_150px_100px_120px] gap-4 px-6 py-3 items-center hover:bg-white/[0.02]"
                  >
                    <span className="text-xs font-mono text-[#8A8F98]">
                      {flag.walletAddress.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-white/80 truncate">{flag.reason}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${severityColor(flag.severity)}`}>
                      {flag.severity}
                    </span>
                    <span className="text-xs text-[#8A8F98]">{flag.status}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => resolveFlag.mutate({ flagId: flag.id, status: "dismissed" })}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8F98] hover:text-[#E6B84F] transition-colors"
                        title="Dismiss"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => resolveFlag.mutate({ flagId: flag.id, status: "confirmed" })}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8F98] hover:text-yellow-400 transition-colors"
                        title="Confirm"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Ban wallet ${flag.walletAddress}?`)) {
                            banPlayer.mutate({ walletAddress: flag.walletAddress });
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-[#8A8F98] hover:text-red-400 transition-colors"
                        title="Ban"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-[#8A8F98]">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No open flags. All clear!</p>
              </div>
            )}
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === "actions" && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-[120px_120px_1fr_120px] gap-4 px-6 py-3 bg-white/[0.03] text-xs text-[#8A8F98] uppercase tracking-wider">
              <span>Admin</span>
              <span>Action</span>
              <span>Details</span>
              <span className="text-right">Date</span>
            </div>

            {actions && actions.length > 0 ? (
              <div className="divide-y divide-white/5">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="grid grid-cols-[120px_120px_1fr_120px] gap-4 px-6 py-3 items-center hover:bg-white/[0.02]"
                  >
                    <span className="text-xs font-mono text-[#8A8F98]">
                      {action.adminWallet.slice(0, 8)}...
                    </span>
                    <span className="text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#8A8F98]">
                        {action.actionType}
                      </span>
                    </span>
                    <span className="text-xs text-white/60 truncate">
                      {action.notes || action.targetWallet || "—"}
                    </span>
                    <span className="text-xs text-[#8A8F98] text-right">
                      {new Date(action.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-[#8A8F98]">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No admin actions recorded yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminStat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-[#8A8F98]">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
