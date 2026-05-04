import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("departments").first();
    if (existing) {
      throw new Error("Database already seeded. Clear tables first if you want to re-seed.");
    }

    // --- Departments ---
    const wrmId = await ctx.db.insert("departments", {
      name: "X-Ray WRM",
      code: "WRM",
    });
    const wroId = await ctx.db.insert("departments", {
      name: "X-Ray WRO",
      code: "WRO",
    });

    // --- Schedule Period ---
    const periodId = await ctx.db.insert("schedulePeriods", {
      label: "Oct 2024 Week 1-2",
      startDate: "2024-10-12",
      endDate: "2024-10-25",
    });

    // --- WRM Workers (16) ---
    const wrmNames = [
      "Anderson, J.",
      "Baker, S.",
      "Clark, M.",
      "Davis, R.",
      "Evans, T.",
      "Foster, L.",
      "Garcia, A.",
      "Harris, K.",
      "Jackson, P.",
      "King, D.",
      "Lopez, C.",
      "Miller, N.",
      "Nelson, B.",
      "Owens, F.",
      "Parker, G.",
      "Quinn, H.",
    ];

    const wrmWorkerIds = [];
    for (let i = 0; i < wrmNames.length; i++) {
      const id = await ctx.db.insert("workers", {
        name: wrmNames[i],
        seniorityNumber: i + 1,
        departmentId: wrmId,
        role: "WRM",
        email: `${wrmNames[i].split(",")[0].toLowerCase()}@hospital.dev`,
        isClerk: false,
      });
      wrmWorkerIds.push(id);
    }

    // --- WRO Workers (19) ---
    const wroNames = [
      "Adams, W.",
      "Brown, E.",
      "Carter, V.",
      "Dixon, U.",
      "Edwards, Q.",
      "Franklin, Z.",
      "Green, Y.",
      "Hall, X.",
      "Irving, O.",
      "Jones, I.",
      "Kelly, J.",
      "Lewis, R.",
      "Moore, S.",
      "Nguyen, T.",
      "Ortiz, L.",
      "Patel, M.",
      "Roberts, A.",
      "Smith, D.",
      "Taylor, B.",
    ];

    const wroWorkerIds = [];
    for (let i = 0; i < wroNames.length; i++) {
      const id = await ctx.db.insert("workers", {
        name: wroNames[i],
        seniorityNumber: i + 1,
        departmentId: wroId,
        role: "WRO",
        email: `${wroNames[i].split(",")[0].toLowerCase()}@hospital.dev`,
        isClerk: false,
      });
      wroWorkerIds.push(id);
    }

    // --- Clerk ---
    await ctx.db.insert("workers", {
      name: "Schedule Clerk",
      departmentId: wrmId,
      role: "clerk",
      email: "clerk@hospital.dev",
      isClerk: true,
    });

    // --- Generate shifts for the 14-day period ---
    const wrmShiftCodes = [
      "7-3 M", "3-11 M", "11-7 M", "8-4 M", "4-12 M",
      "9-5 M", "6-2 M", "2300 M", "RP 7:30", "XA 8-4",
    ];
    const wroShiftCodes = [
      "3-11 O", "6-2 O", "7:30 O", "10-6 O", "7-3 O",
      "8-4 O", "9-5 O", "2300 O", "RP 7:00", "CL 7:00",
    ];
    const offCodes = ["VN", "SK", "ML", "HO"];

    function getDateStr(startDate: string, dayOffset: number): string {
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayOffset);
      return d.toISOString().split("T")[0];
    }

    // Seed deterministic shifts
    for (let day = 0; day < 14; day++) {
      const date = getDateStr("2024-10-12", day);
      const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

      // WRM shifts
      for (let w = 0; w < wrmWorkerIds.length; w++) {
        let code: string;
        if (isWeekend && w % 4 === 0) {
          code = offCodes[day % offCodes.length];
        } else if (w === 3 && day === 5) {
          code = "Call";
        } else {
          code = wrmShiftCodes[(w + day) % wrmShiftCodes.length];
        }

        await ctx.db.insert("shifts", {
          workerId: wrmWorkerIds[w],
          schedulePeriodId: periodId,
          shiftDate: date,
          shiftCode: code,
          departmentId: wrmId,
          isVacant: false,
        });
      }

      // WRO shifts
      for (let w = 0; w < wroWorkerIds.length; w++) {
        let code: string;
        if (isWeekend && w % 5 === 0) {
          code = offCodes[(day + w) % offCodes.length];
        } else if (w === 7 && day === 3) {
          code = "Call";
        } else {
          code = wroShiftCodes[(w + day) % wroShiftCodes.length];
        }

        await ctx.db.insert("shifts", {
          workerId: wroWorkerIds[w],
          schedulePeriodId: periodId,
          shiftDate: date,
          shiftCode: code,
          departmentId: wroId,
          isVacant: false,
        });
      }
    }
  },
});
