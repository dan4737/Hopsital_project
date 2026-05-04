import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { ScheduleTable } from "../components/ScheduleTable";
import { MyShifts } from "../components/MyShifts";
import { SwapBoard } from "../components/SwapBoard";
const TABS = ["Schedule", "My Shifts", "Swap Board"];

export function SchedulePage() {
  const { signOut } = useAuthActions();
  const [activeTab, setActiveTab] = useState("Schedule");

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

  const visibleTabs = TABS;

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
              {currentWorker ? (
                <span className="text-sm text-slate-600 hidden sm:inline">
                  {currentWorker.name}
                  {currentWorker.isClerk && (
                    <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Clerk
                    </span>
                  )}
                </span>
              ) : (
                <LinkProfileButtons />
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
            {TABS.map((tab) => (
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
                className="text-sm border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-48"
              />
            </div>
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
            nameFilter={nameFilter}
          />
        )}
        {activeTab === "My Shifts" && (
          <MyShifts currentWorker={currentWorker} />
        )}
        {activeTab === "Swap Board" && (
          <SwapBoard currentWorker={currentWorker} />
        )}
      </main>
    </div>
  );
}

function LinkProfileButtons() {
  const linkToWorker = useMutation(api.linkUser.linkToWorker);
  const [showInput, setShowInput] = useState(false);
  const [workerEmail, setWorkerEmail] = useState("");

  async function handleLink(e) {
    e.preventDefault();
    try {
      const result = await linkToWorker({ workerEmail: workerEmail.trim() });
      alert(`Linked as ${result.linked}!`);
    } catch (err) {
      alert(err.message);
    }
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
      >
        Link Worker Profile
      </button>
    );
  }

  return (
    <form onSubmit={handleLink} className="flex gap-1">
      <input
        type="email"
        value={workerEmail}
        onChange={(e) => setWorkerEmail(e.target.value)}
        placeholder="your-name@hospital.dev"
        className="text-xs border border-slate-300 rounded-lg px-2 py-1 w-44 outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      <button
        type="submit"
        className="text-xs font-medium text-white bg-blue-600 px-2 py-1 rounded-lg hover:bg-blue-700"
      >
        Go
      </button>
    </form>
  );
}
