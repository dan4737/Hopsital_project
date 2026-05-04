import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShiftBadge } from "./ShiftBadge";

export function SwapBoard({ currentWorker }) {
  const openSwaps = useQuery(api.swapRequests.listOpen);
  const claimSwap = useMutation(api.swapRequests.claim);
  const cancelSwap = useMutation(api.swapRequests.cancel);

  if (openSwaps === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (openSwaps.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <svg
          className="mx-auto w-12 h-12 text-slate-300 mb-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
        <p className="text-lg font-medium">No open swaps</p>
        <p className="text-sm mt-1">
          When someone posts a shift for swap, it will appear here.
        </p>
      </div>
    );
  }

  async function handleClaim(swapId) {
    if (!currentWorker) {
      alert("No worker profile linked to your account.");
      return;
    }
    try {
      await claimSwap({
        swapRequestId: swapId,
        claimedBy: currentWorker._id,
      });
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCancel(swapId) {
    try {
      await cancelSwap({ swapRequestId: swapId });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Swap Board
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {openSwaps.map((swap) => {
          const shift = swap.shift;
          const poster = swap.postedByWorker;
          const isMySwap = currentWorker?._id === swap.postedBy;
          const dateObj = shift
            ? new Date(shift.shiftDate + "T12:00:00")
            : null;

          return (
            <div
              key={swap._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {poster?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateObj
                      ? dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "Unknown date"}
                  </p>
                </div>
                <ShiftBadge code={shift?.shiftCode} />
              </div>

              {swap.reason && (
                <p className="text-xs text-slate-500 mb-3 italic">
                  &ldquo;{swap.reason}&rdquo;
                </p>
              )}

              {isMySwap ? (
                <button
                  onClick={() => handleCancel(swap._id)}
                  className="w-full text-xs font-medium text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors"
                >
                  Cancel Swap
                </button>
              ) : (
                <button
                  onClick={() => handleClaim(swap._id)}
                  className="w-full text-xs font-medium text-white bg-green-600 rounded-lg py-1.5 hover:bg-green-700 transition-colors"
                >
                  Claim This Shift
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
