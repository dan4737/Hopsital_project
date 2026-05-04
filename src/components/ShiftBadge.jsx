const SHIFT_STYLES = {
  VN: "bg-amber-100 text-amber-800",
  SK: "bg-pink-100 text-pink-800",
  ML: "bg-purple-100 text-purple-800",
  HO: "bg-gray-100 text-gray-600",
  Call: "bg-red-100 text-red-700",
};

function getShiftStyle(code) {
  for (const [key, cls] of Object.entries(SHIFT_STYLES)) {
    if (code.includes(key)) return cls;
  }
  if (code.includes("RP") || code.includes("CL"))
    return "bg-orange-100 text-orange-800";
  if (code.includes("XA")) return "bg-teal-100 text-teal-800";
  if (code.includes("2300")) return "bg-violet-100 text-violet-800";
  if (code.includes("O")) return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

export function ShiftBadge({ code, swapPosted }) {
  if (!code) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getShiftStyle(code)}`}
    >
      {code}
      {swapPosted && <span className="ml-1 text-red-500">↔</span>}
    </span>
  );
}
