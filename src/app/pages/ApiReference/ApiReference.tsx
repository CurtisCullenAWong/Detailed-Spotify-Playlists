import React, { useState, useEffect } from "react";
import { Code2, ListMusic, RadioTower, Laptop2, X, ChevronDown } from "lucide-react";
import { API_SECTIONS } from "../../../data";
import { loadPreferences, PreferenceUpdaters } from "../../../utils/userPreferences";
import MethodBadge from "./components/MethodBadge";

interface ApiReferenceProps {
  enableDeprecatedApis: boolean;
}

export default function ApiReference({ enableDeprecatedApis }: ApiReferenceProps) {
  const preferences = loadPreferences();
  const [openSection, setOpenSection] = useState<string>(preferences.apiOpenSection || "User Profiles & Activity");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(preferences.apiExpandedEndpoint);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showDeprecated = enableDeprecatedApis;

  // Save preferences when they change
  useEffect(() => {
    PreferenceUpdaters.setApiSection(openSection);
  }, [openSection]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0d2a1a] to-[#121212] px-4 md:px-8 pt-6 md:pt-8 pb-5 md:pb-6 border-b border-[#282828]">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#1DB954]/20 rounded-lg flex items-center justify-center border border-[#1DB954]/30">
            <Code2 size={20} className="md:hidden text-[#1DB954]" />
            <Code2 size={24} className="hidden md:block text-[#1DB954]" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Postman Collection</p>
            <h1 className="text-white text-[20px] md:text-[26px] font-extrabold leading-tight">Spotify API Reference</h1>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-md bg-[#282828] text-white">
            <ListMusic size={18} />
          </button>
        </div>
        <p className="text-[#B3B3B3] text-[13px] max-w-2xl">Complete endpoint reference for the Spotify Web API. All requests require <code className="text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded text-[12px] font-mono">Authorization: Bearer {"{{access_token}}"}</code> in the request header.</p>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
            <span className="text-[#B3B3B3] text-[12px]">Base URL: <span className="text-white font-mono text-[12px]">https://api.spotify.com/v1</span></span>
          </div>
          <div className="flex items-center gap-2">
            <RadioTower size={13} className="text-[#1DB954]" />
            <span className="text-[#B3B3B3] text-[12px]">{API_SECTIONS.reduce((acc, s) => acc + (showDeprecated ? s.endpoints.length : s.endpoints.filter(e => !e.deprecated).length), 0)} endpoints documented</span>
          </div>
          <div className="flex items-center gap-2">
            <Laptop2 size={13} className="text-[#B3B3B3]" />
            <span className="text-[#B3B3B3] text-[12px]">OAuth 2.0 · Read Only</span>
          </div>
        </div>
      </div>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Left Nav */}
        <div className={`${mobileSidebarOpen ? "fixed left-0 top-0 bottom-0 z-50" : "hidden"} md:block w-64 md:w-52 shrink-0 border-r border-[#282828] md:sticky md:top-0 h-screen overflow-y-auto py-4 bg-[#121212]`}>
          <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-[#282828] mb-2">
            <span className="text-white font-semibold">Categories</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="text-[#B3B3B3] hover:text-white">
              <X size={20} />
            </button>
          </div>
          {API_SECTIONS.map((section) => {
            const endpoints = showDeprecated ? section.endpoints : section.endpoints.filter(e => !e.deprecated);
            return (
              <button key={section.name} onClick={() => { setOpenSection(section.name); setMobileSidebarOpen(false); }}
                className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors flex items-center justify-between gap-2 ${openSection === section.name ? "text-white bg-[#282828] border-l-2 border-[#1DB954]" : "text-[#B3B3B3] hover:text-white hover:bg-[#1a1a1a]"}`}>
                <span className="truncate">{section.name}</span>
                <span className="text-[11px] text-[#535353] font-mono shrink-0">{endpoints.length}</span>
              </button>
            );
          })}
        </div>

        {/* Endpoint List */}
        <div className="flex-1 py-4 md:py-6 px-4 md:px-8">
          {API_SECTIONS.filter(s => s.name === openSection).map((section) => {
            const endpoints = showDeprecated ? section.endpoints : section.endpoints.filter(e => !e.deprecated);
            return (
              <div key={section.name}>
                <h2 className="text-white text-[16px] md:text-[18px] font-bold mb-1">{section.name}</h2>
                <p className="text-[#B3B3B3] text-[12px] md:text-[13px] mb-4 md:mb-5">{endpoints.length} endpoints</p>
                <div className="space-y-2">
                  {endpoints.map((ep, i) => {
                    const key = `${section.name}-${i}`;
                    const isExpanded = expandedEndpoint === key;
                    return (
                      <div key={i} className="rounded-lg border border-[#282828] bg-[#181818] overflow-hidden">
                        <button className="w-full flex items-center gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-3.5 hover:bg-[#1e1e1e] transition-colors text-left"
                          onClick={() => setExpandedEndpoint(isExpanded ? null : key)}>
                          <MethodBadge method={ep.method} />
                          <code className="text-white text-[11px] md:text-[13px] font-mono flex-1 truncate">{ep.path}</code>
                          {ep.deprecated && (
                            <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-[#e91429]/10 text-[#e91429] border border-[#e91429]/30 font-semibold uppercase tracking-wider">Deprecated</span>
                          )}
                          <span className="text-[#B3B3B3] text-[12px] truncate max-w-[320px] hidden lg:block">{ep.desc}</span>
                          <ChevronDown size={14} className={`text-[#535353] transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-4 border-t border-[#282828] bg-[#141414]">
                            {ep.deprecated && (
                              <div className="mb-3 px-3 py-2 bg-[#e91429]/10 border border-[#e91429]/30 rounded flex items-start gap-2">
                                <X size={14} className="text-[#e91429] shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[#e91429] text-[11px] font-bold uppercase tracking-wider">Deprecated Endpoint</p>
                                  <p className="text-[#e91429]/80 text-[12px] mt-1">This endpoint is deprecated and may be removed in a future version. Please use alternative endpoints.</p>
                                </div>
                              </div>
                            )}
                            <p className="text-[#B3B3B3] text-[13px] mb-4 leading-relaxed">{ep.desc}</p>
                            
                            {/* Request Headers Section */}
                            <div className="mb-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#535353] mb-2">Request Headers</p>
                              <div className="space-y-1.5 font-mono text-[12px] bg-[#1e1e1e] border border-white/5 rounded-lg p-3">
                                <div className="flex items-start gap-4">
                                  <span className="text-[#1DB954] w-28 shrink-0 font-semibold">Authorization</span>
                                  <span className="text-[#B3B3B3] flex-1">Bearer {"{access_token}"}</span>
                                </div>
                                {ep.headers && ep.headers.map((h) => (
                                  h.key !== "Authorization" && (
                                    <div key={h.key} className="flex items-start gap-4 border-t border-white/5 pt-1.5 mt-1.5">
                                      <span className="text-[#1DB954] w-28 shrink-0 font-semibold">{h.key}</span>
                                      <span className="text-[#B3B3B3] flex-1">
                                        {h.value || "*"} {h.description && <span className="text-[#535353] text-[11px] block mt-0.5">{h.description}</span>}
                                      </span>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>

                            {/* Query Parameters Section */}
                            {ep.queryParams && ep.queryParams.length > 0 && (
                              <div className="mb-4 overflow-hidden border border-white/5 rounded-lg">
                                <div className="bg-[#1e1e1e] px-4 py-2 border-b border-white/5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#535353]">Query Parameters</p>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-[12px]">
                                    <thead>
                                      <tr className="bg-[#1a1a1a] text-[#B3B3B3] font-bold border-b border-white/5">
                                        <th className="px-4 py-2 font-mono text-[#1DB954]">Parameter</th>
                                        <th className="px-4 py-2">Default / Example</th>
                                        <th className="px-4 py-2">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-[#141414]">
                                      {ep.queryParams.map((q) => (
                                        <tr key={q.key} className="hover:bg-[#1a1a1a]/50 transition-colors">
                                          <td className="px-4 py-2.5 font-mono text-white font-semibold">{q.key}</td>
                                          <td className="px-4 py-2.5 font-mono text-[#B3B3B3]">{q.value || "-"}</td>
                                          <td className="px-4 py-2.5 text-[#B3B3B3] leading-relaxed">{q.description || "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Request Body Section */}
                            {ep.body && (
                              <div className="mb-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#535353] mb-2">Request Body (JSON)</p>
                                <pre className="text-[12px] font-mono text-[#1DB954] bg-[#0d1f0f] border border-[#1DB954]/20 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                  {ep.body}
                                </pre>
                              </div>
                            )}

                            {/* Scope & Metadata Footer */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#535353]">
                              <div className="flex items-center gap-2">
                                <span>Required OAuth Scope:</span>
                                <span className="font-mono text-[#B3B3B3] bg-[#282828] px-2 py-0.5 rounded border border-[#383838]">
                                  {ep.method === "GET" ? "user-read-private" : ep.path.includes("player") ? "user-modify-playback-state" : "playlist-modify-private"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
