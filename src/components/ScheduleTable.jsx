import { ShiftBadge } from "./ShiftBadge";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ScheduleTable({ shifts, selectedDeptId, currentWorker }) {
  const openSwaps = useQuery(api.swapRequests.listOpen);
  const swapShiftIds = new Set(openSwaps?.map((s) => s.shiftId) ?? []);

  if (shifts === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const filtered = selectedDeptId
    ? shifts.filter((s) => s.departmentId === selectedDeptId)
    : shifts;

  // Group by department then by worker
  const byDept = {};
  for (const s of filtered) {
    const deptKey = s.departmentId;
    if (!byDept[deptKey]) {
      byDept[deptKey] = { department: s.department, workers: {} };
    }
    const wKey = s.workerId;
    if (!byDept[deptKey].workers[wKey]) {
      byDept[deptKey].workers[wKey] = { worker: s.worker, shifts: [] };
    }
    byDept[deptKey].workers[wKey].shifts.push(s);
  }

  // Sorted unique dates
  const dates = [...new Set(filtered.map((s) => s.shiftDate))].sort();

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg font-medium">No schedule data</p>
        <p className="text-sm mt-1">
          Run the seed function from the Convex dashboard to populate sample
          data.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2 text-left font-medium text-slate-700 min-w-[160px]">
              Worker
            </th>
            <th className="px-2 py-2 text-center font-medium text-slate-500 min-w-[40px]">
              #
            </th>
            {dates.map((d) => (
              <th
                key={d}
                className="px-2 py-2 text-center font-medium text-slate-700 min-w-[80px]"
              >
                <div className="text-xs text-slate-500">
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </div>
                <div>
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(byDept).map(([deptId, { department, workers }]) => (
            <>
              <tr key={`dept-${deptId}`} className="bg-slate-100">
                <td
                  colSpan={dates.length + 2}
                  className="px-3 py-2 font-semibold text-slate-800 text-xs uppercase tracking-wide"
                >
                  {department?.name ?? "Unknown Department"}
                </td>
              </tr>
              {Object.values(workers)
                .sort(
                  (a, b) =>
                    (a.worker?.seniorityNumber ?? 9999) -
                    (b.worker?.seniorityNumber ?? 9999)
                )
                .map(({ worker, shifts: workerShifts }) => {
                  const isMe = currentWorker?._id === worker?._id;
                  return (
                    <tr
                      key={worker?._id}
                      className={`border-b border-slate-100 ${isMe ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
                    >
                      <td
                        className={`sticky left-0 z-10 px-3 py-2 font-medium whitespace-nowrap ${isMe ? "bg-blue-50/50 text-blue-900" : "bg-white text-slate-800"}`}
                      >
                        {worker?.name}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-400">
                        {worker?.seniorityNumber ?? "—"}
                      </td>
                      {dates.map((d) => {
                        const shift = workerShifts.find(
                          (s) => s.shiftDate === d
                        );
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <ShiftBadge
                              code={shift?.shiftCode}
                              swapPosted={shift && swapShiftIds.has(shift._id)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
