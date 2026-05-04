import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShiftBadge } from "../components/ShiftBadge";

export function ClerkDashboard({ shifts, selectedDeptId, periodId, nameFilter = "" }) {
  const updateShiftCode = useMutation(api.shifts.updateShiftCode);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (shifts === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
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

  // Group by sub-department → worker
  const bySub = {};
  for (const s of filtered) {
    const subKey = s.worker?.subDepartment || s.department?.name || "Other";
    if (!bySub[subKey]) bySub[subKey] = {};
    const wKey = s.workerId;
    if (!bySub[subKey][wKey]) {
      bySub[subKey][wKey] = { worker: s.worker, shifts: [] };
    }
    bySub[subKey][wKey].shifts.push(s);
  }

  // Sorted unique dates
  const dates = [...new Set(filtered.map((s) => s.shiftDate))].sort();

  // Compute missing shifts
  const missingByDept = {};
  for (const s of filtered) {
    if (!s.isVacant) continue;
    const dName = s.department?.name || "Unknown";
    if (!missingByDept[dName]) missingByDept[dName] = {};
    if (!missingByDept[dName][s.shiftDate]) missingByDept[dName][s.shiftDate] = [];
    missingByDept[dName][s.shiftDate].push(s.shiftCode);
  }

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
        <h2 className="text-lg font-semibold text-slate-900">Manage Schedule</h2>
        <p className="text-sm text-slate-500">Click any shift cell to edit inline</p>
      </div>

      <div className="flex gap-4">
        {/* Grid */}
        <div className="flex-1 min-w-0">
          {dates.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No shifts found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                  {Object.entries(bySub).map(([subName, workers]) => (
                    <ClerkSubSection
                      key={subName}
                      subName={subName}
                      workers={workers}
                      dates={dates}
                      editingId={editingId}
                      editValue={editValue}
                      setEditingId={setEditingId}
                      setEditValue={setEditValue}
                      handleSave={handleSave}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Missing Shifts */}
        {Object.keys(missingByDept).length > 0 && (
          <div className="w-56 shrink-0 space-y-3">
            {Object.entries(missingByDept).map(([deptName, dateMap]) => (
              <div key={deptName} className="rounded-xl border border-red-200 bg-red-50 p-3">
                <h3 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                  Missing — {deptName}
                </h3>
                <div className="space-y-1">
                  {Object.entries(dateMap)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, codes]) => (
                      <div key={date} className="flex items-start gap-2 text-xs">
                        <span className="font-medium text-red-700 whitespace-nowrap min-w-[50px]">
                          {new Date(date + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-red-600">{codes.join(", ")}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClerkSubSection({ subName, workers, dates, editingId, editValue, setEditingId, setEditValue, handleSave }) {
  const sorted = Object.values(workers).sort(
    (a, b) => (a.worker?.seniorityNumber ?? 99999) - (b.worker?.seniorityNumber ?? 99999)
  );

  return (
    <>
      <tr className="bg-slate-100">
        <td colSpan={dates.length + 3} className="px-2 py-1.5 font-bold text-slate-800 text-xs uppercase tracking-wider">
          {subName}
        </td>
      </tr>
      {sorted.map(({ worker, shifts: workerShifts }) => {
        const quals = worker?.qualifications;
        return (
          <tr key={worker?._id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <td className="sticky left-0 bg-white z-10 px-2 py-1 font-medium text-slate-800 whitespace-nowrap text-[13px]">
              {worker?.name}
              {quals && quals.length > 0 && (
                <span className="ml-1 text-[10px] text-slate-400">({quals.join(", ")})</span>
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

              if (editingId === shift._id) {
                return (
                  <td key={d} className="px-0.5 py-0.5">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(shift._id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleSave(shift._id)}
                      className="w-full text-xs px-1 py-0.5 border border-amber-400 rounded focus:ring-1 focus:ring-amber-500 outline-none text-center"
                    />
                  </td>
                );
              }

              return (
                <td
                  key={d}
                  className={`px-1 py-1 text-center cursor-pointer hover:bg-amber-50 transition-colors ${shift.isVacant ? "bg-yellow-100" : ""}`}
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
        );
      })}
    </>
  );
}
