import { describe, expect, it } from "vitest";
import {
  buildBridgeReplayFrames,
  isCrossDomainBridge,
  sortBridgeRiskRows
} from "@/lib/client/bridge-insight";

describe("bridge-insight", () => {
  const rows = [
    {
      id: "a",
      sourceDomain: "math",
      targetDomain: "math",
      risk: 0.6,
      weight: 0.7
    },
    {
      id: "b",
      sourceDomain: "math",
      targetDomain: "physics",
      risk: 0.56,
      weight: 0.8
    },
    {
      id: "c",
      sourceDomain: "chemistry",
      targetDomain: "physics",
      risk: 0.52,
      weight: 0.9
    }
  ];

  it("identifies cross-domain bridges", () => {
    expect(isCrossDomainBridge(rows[0]!)).toBe(false);
    expect(isCrossDomainBridge(rows[1]!)).toBe(true);
  });

  it("sorts by risk and applies cross-domain priority", () => {
    const cross = sortBridgeRiskRows(rows, "risk_desc", "cross_priority");
    expect(cross[0]?.id).toBe("b");
    expect(cross[1]?.id).toBe("c");
    expect(cross[2]?.id).toBe("a");
  });

  it("sorts by risk and applies same-domain priority", () => {
    const same = sortBridgeRiskRows(rows, "risk_desc", "same_priority");
    expect(same[0]?.id).toBe("a");
    expect(same[1]?.id).toBe("b");
  });

  it("builds replay frames in focus mode with fallback", () => {
    const frames = buildBridgeReplayFrames(
      [
        {
          id: "s1",
          at: "2026-03-01T10:00:00.000Z",
          bridges: [{ id: "bridge_1", risk: 0.7 }, { id: "bridge_2", risk: 0.6 }]
        },
        {
          id: "s2",
          at: "2026-03-01T11:00:00.000Z",
          bridges: [{ id: "bridge_3", risk: 0.68 }]
        }
      ],
      {
        mode: "focus",
        targetBridgeId: "bridge_2",
        focusLimit: 8
      }
    );
    expect(frames).toHaveLength(2);
    expect(frames[0]?.bridge.id).toBe("bridge_2");
    expect(frames[1]?.bridge.id).toBe("bridge_3");
  });

  it("builds replay frames in all mode and truncates by limit", () => {
    const frames = buildBridgeReplayFrames(
      [
        {
          id: "s1",
          at: "2026-03-01T10:00:00.000Z",
          bridges: [{ id: "bridge_1" }, { id: "bridge_2" }]
        },
        {
          id: "s2",
          at: "2026-03-01T11:00:00.000Z",
          bridges: [{ id: "bridge_3" }, { id: "bridge_4" }]
        }
      ],
      {
        mode: "all",
        targetBridgeId: "",
        allLimit: 3
      }
    );
    expect(frames).toHaveLength(3);
    expect(frames[0]?.bridge.id).toBe("bridge_1");
    expect(frames[2]?.bridge.id).toBe("bridge_3");
  });
});
