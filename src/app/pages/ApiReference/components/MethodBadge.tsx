import React from "react";

interface MethodBadgeProps {
  method: string;
}

export default function MethodBadge({ method }: MethodBadgeProps) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-900/60 text-emerald-400 border-emerald-800",
    POST: "bg-blue-900/60 text-blue-400 border-blue-800",
    PUT: "bg-amber-900/60 text-amber-400 border-amber-800",
    DELETE: "bg-red-900/60 text-red-400 border-red-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${colors[method] ?? "bg-[#282828] text-[#B3B3B3]"}`}>
      {method}
    </span>
  );
}
