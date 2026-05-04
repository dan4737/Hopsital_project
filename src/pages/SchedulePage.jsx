import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { ScheduleTable } from "../components/ScheduleTable";
import { MyShifts } from "../components/MyShifts";
import { SwapBoard } from "../components/SwapBoard";
import { ClerkDashboard } from "./ClerkDashboard";

const TABS = ["Schedule", "My Shifts", "Swap Board", "Clerk"];

export function SchedulePage() {
  const { signOut } = useAuthActions();
  const [activeTab, setActiveTab] = useState("Schedule");

  const currentWorker = useQuery(api.workers.getByUserId);
  const periods = useQuery(api.workers.listSchedulePeriods);
  const departments = useQuery(api.workers.listDepartments);

  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const periodId = selectedPeriodId || periods?.[0]?._id;

  const shifts = useQuery(
    api.shifts.listByPeriod,
    periodId ? { schedulePeriodId: periodId } : "skip"
  );

  const visibleTabs = currentWorker?.isClerk
    ? TABS
    : TABS.filter((t) => t !== "Clerk");

  if (periods === undefined || departments === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-slate-900 hidden sm:block">
                Shift Scheduler
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {currentWorker && (
                <span className="text-sm text-slate-600 hidden sm:inline">
                  {currentWorker.name}
                  {currentWorker.isClerk && (
                    <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Clerk
                    </span>
                  )}
                </span>
              )}
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
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
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
      {(activeTab === "Schedule" || activeTab === "Clerk") && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3">
            <select
              value={selectedPeriodId || periods?.[0]?._id || ""}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Departments</option>
              {departments?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "Schedule" && (
          <ScheduleTable
            shifts={shifts}
            selectedDeptId={selectedDeptId}
            currentWorker={currentWorker}
          />
        )}
        {activeTab === "My Shifts" && (
          <MyShifts currentWorker={currentWorker} />
        )}
        {activeTab === "Swap Board" && (
          <SwapBoard currentWorker={currentWorker} />
        )}
        {activeTab === "Clerk" && currentWorker?.isClerk && (
          <ClerkDashboard
            shifts={shifts}
            selectedDeptId={selectedDeptId}
            periodId={periodId}
          />
        )}
      </main>
    </div>
  );
}
