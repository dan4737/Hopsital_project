import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { ClerkDashboard } from "./ClerkDashboard";
import { ScheduleTable } from "../components/ScheduleTable";
import { SwapBoard } from "../components/SwapBoard";

const TABS = ["Manage Schedule", "View Schedule", "Swap Board"];

export function ClerkFullPage() {
  const { signOut } = useAuthActions();
  const [activeTab, setActiveTab] = useState("Manage Schedule");

  const currentWorker = useQuery(api.workers.getByUserId);
  const periods = useQuery(api.workers.listSchedulePeriods);
  const departments = useQuery(api.workers.listDepartments);

  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [nameFilter, setNameFilter] = useState("");

  const periodId = selectedPeriodId || periods?.[0]?._id;

  const shifts = useQuery(
    api.shifts.listByPeriod,
    periodId ? { schedulePeriodId: periodId } : "skip"
  );

  if (periods === undefined || departments === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/30">
      {/* Header */}
      <header className="bg-white border-b border-amber-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Clerk Dashboard
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 hidden sm:inline">
                {currentWorker?.name}
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  Clerk
                </span>
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "border-amber-600 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3">
          <select
            value={selectedPeriodId || periods?.[0]?._id || ""}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            {periods?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDeptId || ""}
            onChange={(e) => setSelectedDeptId(e.target.value || null)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Search by name..."
              className="text-sm border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none w-48"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "Manage Schedule" && (
          <ClerkDashboard
            shifts={shifts}
            selectedDeptId={selectedDeptId}
            periodId={periodId}
            nameFilter={nameFilter}
          />
        )}
        {activeTab === "View Schedule" && (
          <ScheduleTable
            shifts={shifts}
            selectedDeptId={selectedDeptId}
            currentWorker={currentWorker}
            nameFilter={nameFilter}
          />
        )}
        {activeTab === "Swap Board" && (
          <SwapBoard currentWorker={currentWorker} />
        )}
      </main>
    </div>
  );
}
