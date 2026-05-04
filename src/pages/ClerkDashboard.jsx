import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShiftBadge } from "../components/ShiftBadge";

export function ClerkDashboard({ shifts, selectedDeptId, periodId }) {
  const updateShiftCode = useMutation(api.shifts.updateShiftCode);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

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

  // Group by worker
  const byWorker = {};
  for (const s of filtered) {
    const key = s.workerId;
    if (!byWorker[key]) {
      byWorker[key] = { worker: s.worker, shifts: [] };
    }
    byWorker[key].shifts.push(s);
  }

  // Sorted unique dates
  const dates = [...new Set(filtered.map((s) => s.shiftDate))].sort();

  async function handleSave(shiftId) {
    try {
      await updateShiftCode({ shiftId, shiftCode: editValue.trim() });
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Clerk Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Click any shift cell to edit inline
        </p>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No shifts found. Run the seed function from the Convex dashboard to
          populate data.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2 text-left font-medium text-slate-700 min-w-[160px]">
                  Worker
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="px-2 py-2 text-center font-medium text-slate-700 min-w-[80px]"
                  >
                    <div className="text-xs">
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
              {Object.values(byWorker).map(({ worker, shifts: workerShifts }) => (
                <tr
                  key={worker?._id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                    {worker?.name}
                    {worker?.seniorityNumber && (
                      <span className="ml-1 text-xs text-slate-400">
                        #{worker.seniorityNumber}
                      </span>
                    )}
                  </td>
                  {dates.map((d) => {
                    const shift = workerShifts.find((s) => s.shiftDate === d);
                    if (!shift) {
                      return (
                        <td
                          key={d}
                          className="px-2 py-2 text-center text-slate-300"
                        >
                          —
                        </td>
                      );
                    }

                    if (editingId === shift._id) {
                      return (
                        <td key={d} className="px-1 py-1">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(shift._id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => handleSave(shift._id)}
                            className="w-full text-xs px-1.5 py-1 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={d}
                        className="px-2 py-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          setEditingId(shift._id);
                          setEditValue(shift.shiftCode);
                        }}
                      >
                        <ShiftBadge code={shift.shiftCode} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
