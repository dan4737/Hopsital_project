import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const linkToClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerk = await ctx.db
      .query("workers")
      .filter((q) => q.eq(q.field("isClerk"), true))
      .first();
    if (!clerk) throw new Error("No clerk record found. Run seed first.");

    await ctx.db.patch(clerk._id, { userId: identity.subject });
    return { linked: clerk.name, userId: identity.subject };
  },
});

export const linkToWorker = mutation({
  args: { workerEmail: v.string() },
  handler: async (ctx, { workerEmail }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const worker = await ctx.db
      .query("workers")
      .withIndex("by_email", (q) => q.eq("email", workerEmail))
      .first();
    if (!worker) throw new Error(`No worker with email ${workerEmail}`);

    await ctx.db.patch(worker._id, { userId: identity.subject });
    return { linked: worker.name, userId: identity.subject };
  },
});
