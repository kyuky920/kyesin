// Venue name → short key used to match rooms in the floor plan
const VENUE_ROOM_KEY: Record<string, string> = {
  "새가족부실":              "새가족부",
  "오케스트라실":            "오케스트라",
  "요셉실(1청년부)":         "요셉실",
  "다니엘실(중고등부)":      "다니엘실",
  "라운지 회의실":           "라운지",
  "라운지 식당":             "라운지",
  "라운지 벤치":             "라운지",
  "다윗실(초등부)":          "다윗실",
  "사무엘실(유치부)":        "사무엘실",
  "사무엘실(유치부 회의실)": "사무엘실",
  "바나바실(2청년부)":       "바나바실",
  "본관 유아실":             "자모실",
  "본관 쉼터":               "쉼터",
  "본관 친교실":             "친교실",
  "본관 회의실":             "회의실",
  "마리아 전도회실":         "마리아",
  "디모데 전도회실":         "디모데",
  "베드로 전도회실":         "베드로",
  "바울 전도회실":           "바울",
  "루디아 전도회실":         "루디아",
  "본관 식당 A":             "식당",
  "본관 식당 B":             "식당",
  "안나 전도회실":           "안나",
};

const VENUE_LOCATION: Record<string, { building: string; floor: string }> = {
  "새가족부실":              { building: "교육관", floor: "1F" },
  "오케스트라실":            { building: "교육관", floor: "1F" },
  "요셉실(1청년부)":         { building: "교육관", floor: "2F" },
  "다니엘실(중고등부)":      { building: "교육관", floor: "2F" },
  "라운지 회의실":           { building: "교육관", floor: "2F" },
  "라운지 식당":             { building: "교육관", floor: "2F" },
  "라운지 벤치":             { building: "교육관", floor: "2F" },
  "다윗실(초등부)":          { building: "교육관", floor: "1F" },
  "사무엘실(유치부)":        { building: "교육관", floor: "1F" },
  "사무엘실(유치부 회의실)": { building: "교육관", floor: "1F" },
  "바나바실(2청년부)":       { building: "교육관", floor: "3F" },
  "본관 유아실":             { building: "본관",   floor: "3F" },
  "본관 쉼터":               { building: "본관",   floor: "3F" },
  "본관 친교실":             { building: "본관",   floor: "1F" },
  "본관 회의실":             { building: "본관",   floor: "1F" },
  "마리아 전도회실":         { building: "교육관", floor: "3F" },
  "디모데 전도회실":         { building: "교육관", floor: "3F" },
  "베드로 전도회실":         { building: "교육관", floor: "3F" },
  "바울 전도회실":           { building: "교육관", floor: "3F" },
  "루디아 전도회실":         { building: "본관",   floor: "1F" },
  "본관 식당 A":             { building: "본관",   floor: "B1" },
  "본관 식당 B":             { building: "본관",   floor: "B1" },
  "안나 전도회실":           { building: "본관",   floor: "1F" },
};

const BUILDINGS = [
  {
    name: "본관",
    floors: [
      { floor: "3F", label: "3층", rooms: ["자모실", "쉼터"] },
      { floor: "2F", label: "2층", rooms: ["본당"] },
      { floor: "1F", label: "1층", rooms: ["친교실", "회의실", "안나", "루디아"] },
      { floor: "B1", label: "B1",  rooms: ["식당"] },
    ],
  },
  {
    name: "교육관",
    floors: [
      { floor: "3F", label: "3층", rooms: ["바나바실", "마리아", "디모데", "바울", "베드로"] },
      { floor: "2F", label: "2층", rooms: ["요셉실", "다니엘실", "라운지"] },
      { floor: "1F", label: "1층", rooms: ["사무엘실", "다윗실", "오케스트라", "새가족부"] },
    ],
  },
];

function floorKo(floor: string) {
  if (floor === "B1") return "지하 1층";
  return floor.replace("F", "층");
}

export default function ChurchMap({ venueName }: { venueName: string | null }) {
  const roomKey  = venueName ? (VENUE_ROOM_KEY[venueName]  ?? null) : null;
  const location = venueName ? (VENUE_LOCATION[venueName] ?? null) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
      {/* 헤더 */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #1c2e58" }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-white text-sm font-bold">명륜교회 안내도</p>
        </div>

        {/* 셀모임 위치 배지 */}
        {location && venueName && (
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(233,185,74,0.08)", border: "1px solid rgba(233,185,74,0.22)" }}>
            <svg className="w-3 h-3 text-gold flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-gold/80 text-[11px] font-medium">
              {location.building} {floorKo(location.floor)}
            </span>
            <span className="text-gold/40 text-[11px]">→</span>
            <span className="text-gold text-[11px] font-bold">{venueName}</span>
          </div>
        )}
      </div>

      {/* 층별 안내도 */}
      <div className="p-3 space-y-3">
        {BUILDINGS.map((building) => (
          <div key={building.name}>
            <p className="text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">{building.name}</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c2e58" }}>
              {building.floors.map((floorData, idx) => {
                const floorHl = !!(location && location.building === building.name && location.floor === floorData.floor);
                return (
                  <div
                    key={floorData.floor}
                    className={`flex items-start gap-2 px-2.5 py-1.5 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}
                    style={{ background: floorHl ? "rgba(233,185,74,0.05)" : "transparent" }}
                  >
                    <span
                      className="text-[10px] font-bold w-5 flex-shrink-0 pt-0.5"
                      style={{ color: floorHl ? "#e9b94a" : floorData.floor === "B1" ? "#374151" : "#475569" }}
                    >
                      {floorData.label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {floorData.rooms.map((room) => {
                        const hl = floorHl && roomKey === room;
                        return (
                          <span
                            key={room}
                            className="text-[10px] leading-tight px-1.5 py-0.5 rounded"
                            style={
                              hl
                                ? { background: "rgba(233,185,74,0.18)", border: "1px solid rgba(233,185,74,0.45)", color: "#e9b94a", fontWeight: 700 }
                                : { background: "transparent", border: "1px solid rgba(28,46,88,0.9)", color: "#475569" }
                            }
                          >
                            {room}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
