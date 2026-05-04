import { ShiftBadge } from "./ShiftBadge";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ScheduleTable({ shifts, selectedDeptId, currentWorker, nameFilter = "" }) {
  const openSwaps = useQuery(api.swapRequests.listOpen);
  const swapShiftIds = new Set(openSwaps?.map((s) => s.shiftId) ?? []);

  if (shifts === undefined || shifts === null) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg font-medium">Select a schedule period</p>
        <p className="text-sm mt-1">Choose a period from the dropdown above to view shifts.</p>
      </div>
    );
  }

  let filtered = selectedDeptId
    ? shifts.filter((s) => s.departmentId === selectedDeptId)
    : shifts;

  if (nameFilter.trim()) {
    const q = nameFilter.trim().toLowerCase();
    filtered = filtered.filter((s) => s.worker?.name?.toLowerCase().includes(q));
  }

  // Group by department → sub-department → worker
  const byDept = {};
  for (const s of filtered) {
    const deptKey = s.departmentId;
    if (!byDept[deptKey]) {
      byDept[deptKey] = { department: s.department, subs: {} };
    }
    const subKey = s.worker?.subDepartment || s.department?.name || "Other";
    if (!byDept[deptKey].subs[subKey]) {
      byDept[deptKey].subs[subKey] = {};
    }
    const wKey = s.workerId;
    if (!byDept[deptKey].subs[subKey][wKey]) {
      byDept[deptKey].subs[subKey][wKey] = { worker: s.worker, shifts: [] };
    }
    byDept[deptKey].subs[subKey][wKey].shifts.push(s);
  }

  // Sorted unique dates
  const dates = [...new Set(filtered.map((s) => s.shiftDate))].sort();

  // Compute missing shifts (vacant shifts grouped by dept & date)
  const missingByDept = {};
  for (const s of filtered) {
    if (!s.isVacant) continue;
    const dName = s.department?.name || "Unknown";
    if (!missingByDept[dName]) missingByDept[dName] = {};
    if (!missingByDept[dName][s.shiftDate]) missingByDept[dName][s.shiftDate] = [];
    missingByDept[dName][s.shiftDate].push(s.shiftCode);
  }

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg font-medium">No schedule data</p>
        <p className="text-sm mt-1">
          Run the seed function from the Convex dashboard to populate sample data.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Main schedule grid */}
      <div className="flex-1 relative min-w-0">
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-linear-to-l from-slate-100 to-transparent pointer-events-none z-20 rounded-r-xl" />
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-max text-[13px] leading-tight">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 px-2 py-1.5 text-left font-medium text-slate-700 min-w-[140px]">
                  Worker
                </th>
                <th className="px-1 py-1.5 text-center font-medium text-slate-500 min-w-[50px] text-xs">
                  Seniority
                </th>
                <th className="px-1 py-1.5 text-center font-medium text-slate-500 min-w-[60px] text-xs">
                  Modality
                </th>
                {dates.map((d) => (
                  <th key={d} className="px-1 py-1.5 text-center font-medium text-slate-700 min-w-[68px]">
                    <div className="text-[10px] text-slate-400">
                      {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="text-xs">
                      {new Date(d + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDept).map(([deptId, { department, subs }]) =>
                Object.entries(subs).map(([subName, workers]) => (
                  <SubSection
                    key={`${deptId}-${subName}`}
                    subName={subName}
                    workers={workers}
                    dates={dates}
                    currentWorker={currentWorker}
                    swapShiftIds={swapShiftIds}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Shifts panel */}
      {Object.keys(missingByDept).length > 0 && (
        <div className="w-56 shrink-0">
          <MissingShiftsPanel missingByDept={missingByDept} />
        </div>
      )}
    </div>
  );
}

function SubSection({ subName, workers, dates, currentWorker, swapShiftIds }) {
  const sorted = Object.values(workers).sort(
    (a, b) => (a.worker?.seniorityNumber ?? 99999) - (b.worker?.seniorityNumber ?? 99999)
  );

  return (
    <>
      <tr className="bg-slate-100">
        <td
          colSpan={dates.length + 3}
          className="px-2 py-1.5 font-bold text-slate-800 text-xs uppercase tracking-wider"
        >
          {subName}
        </td>
      </tr>
      {sorted.map(({ worker, shifts: workerShifts }) => {
        const isMe = currentWorker?._id === worker?._id;
        const quals = worker?.qualifications;
        return (
          <tr
            key={worker?._id}
            className={`border-b border-slate-100 ${isMe ? "bg-blue-50/40" : "hover:bg-slate-50/50"}`}
          >
            <td
              className={`sticky left-0 z-10 px-2 py-1 font-medium whitespace-nowrap text-[13px] ${
                isMe ? "bg-blue-50/40 text-blue-900" : "bg-white text-slate-800"
              }`}
            >
              {worker?.name}
              {quals && quals.length > 0 && (
                <span className="ml-1 text-[10px] text-slate-400">
                  ({quals.join(", ")})
                </span>
              )}
              {isMe && (
                <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                  You
                </span>
              )}
            </td>
            <td className="px-1 py-1 text-center text-[11px] text-slate-400">
              {worker?.seniorityNumber || "—"}
            </td>
            <td className="px-1 py-1 text-center text-[11px] text-slate-500">
              {quals && quals.length > 0 ? quals.join(", ") : "—"}
            </td>
            {dates.map((d) => {
              const shift = workerShifts.find((s) => s.shiftDate === d);
              if (!shift) {
                return <td key={d} className="px-1 py-1 text-center" />;
              }
              return (
                <td
                  key={d}
                  className={`px-1 py-1 text-center ${shift.isVacant ? "bg-yellow-100" : ""}`}
                >
                  <ShiftBadge
                    code={shift.shiftCode}
                    swapPosted={swapShiftIds.has(shift._id)}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function MissingShiftsPanel({ missingByDept }) {
  return (
    <div className="space-y-3">
      {Object.entries(missingByDept).map(([deptName, dateMap]) => (
        <div
          key={deptName}
          className="rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <h3 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
            Missing Shifts — {deptName}
          </h3>
          <div className="space-y-1">
            {Object.entries(dateMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, codes]) => (
                <div key={date} className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-red-700 whitespace-nowrap min-w-[50px]">
                    {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-red-600">
                    {codes.join(", ")}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
