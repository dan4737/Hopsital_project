import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const swaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return Promise.all(
      swaps.map(async (swap) => ({
        ...swap,
        shift: await ctx.db.get(swap.shiftId),
        postedByWorker: await ctx.db.get(swap.postedBy),
      }))
    );
  },
});

export const post = mutation({
  args: {
    shiftId: v.id("shifts"),
    postedBy: v.id("workers"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("swapRequests", {
      ...args,
      status: "open",
    });
  },
});

export const claim = mutation({
  args: {
    swapRequestId: v.id("swapRequests"),
    claimedBy: v.id("workers"),
  },
  handler: async (ctx, { swapRequestId, claimedBy }) => {
    const swap = await ctx.db.get(swapRequestId);
    if (!swap || swap.status !== "open") throw new Error("Swap not available");

    const shift = await ctx.db.get(swap.shiftId);

    const conflict = await ctx.db
      .query("shifts")
      .withIndex("by_worker", (q) => q.eq("workerId", claimedBy))
      .filter((q) => q.eq(q.field("shiftDate"), shift!.shiftDate))
      .first();
    if (conflict) throw new Error("You already have a shift on this day");

    await ctx.db.patch(swap.shiftId, { workerId: claimedBy });
    await ctx.db.patch(swapRequestId, {
      status: "claimed",
      claimedBy,
      claimedAt: Date.now(),
    });
  },
});

export const cancel = mutation({
  args: { swapRequestId: v.id("swapRequests") },
  handler: async (ctx, { swapRequestId }) => {
    const swap = await ctx.db.get(swapRequestId);
    if (!swap || swap.status !== "open") throw new Error("Swap not available");
    await ctx.db.patch(swapRequestId, { status: "cancelled" });
  },
});
