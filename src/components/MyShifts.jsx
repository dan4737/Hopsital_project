import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShiftBadge } from "./ShiftBadge";
import { PostSwapForm } from "./PostSwapForm";

export function MyShifts({ currentWorker }) {
  const [swapShiftId, setSwapShiftId] = useState(null);

  const myShifts = useQuery(
    api.shifts.listByWorker,
    currentWorker ? { workerId: currentWorker._id } : "skip"
  );

  const openSwaps = useQuery(api.swapRequests.listOpen);
  const swapShiftIds = new Set(openSwaps?.map((s) => s.shiftId) ?? []);

  if (!currentWorker) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg font-medium">No worker profile linked</p>
        <p className="text-sm mt-1">
          Ask your clerk to link your account to a worker record.
        </p>
      </div>
    );
  }

  if (myShifts === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const sorted = [...myShifts].sort((a, b) =>
    a.shiftDate.localeCompare(b.shiftDate)
  );

  const today = new Date().toISOString().split("T")[0];
  const upcoming = sorted.filter((s) => s.shiftDate >= today);
  const past = sorted.filter((s) => s.shiftDate < today);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">My Shifts</h2>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No shifts assigned yet.
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
            Upcoming
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((shift) => (
              <ShiftCard
                key={shift._id}
                shift={shift}
                isSwapPosted={swapShiftIds.has(shift._id)}
                onPostSwap={() => setSwapShiftId(shift._id)}
              />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Past
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
            {past.map((shift) => (
              <ShiftCard
                key={shift._id}
                shift={shift}
                isSwapPosted={swapShiftIds.has(shift._id)}
                isPast
              />
            ))}
          </div>
        </div>
      )}

      {swapShiftId && (
        <PostSwapForm
          shiftId={swapShiftId}
          workerId={currentWorker._id}
          onClose={() => setSwapShiftId(null)}
        />
      )}
    </div>
  );
}

function ShiftCard({ shift, isSwapPosted, onPostSwap, isPast }) {
  const dateObj = new Date(shift.shiftDate + "T12:00:00");
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{dayName}</p>
          <p className="text-lg font-semibold text-slate-900">{dateStr}</p>
        </div>
        <ShiftBadge code={shift.shiftCode} swapPosted={isSwapPosted} />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {shift.department?.name ?? "Unknown Dept"}
      </p>
      {!isPast && !isSwapPosted && onPostSwap && (
        <button
          onClick={onPostSwap}
          className="mt-3 w-full text-xs font-medium text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
        >
          Post for Swap
        </button>
      )}
      {isSwapPosted && (
        <p className="mt-3 text-xs text-center text-red-500 font-medium">
          Posted for swap
        </p>
      )}
    </div>
  );
}
