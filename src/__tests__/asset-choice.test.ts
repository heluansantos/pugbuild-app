import { assetEmoji, assetLabel, shouldPickAsset, splitAssetChoice } from "../features/worker/asset-choice";
import type { AssetDto, WorkerFleetDto } from "../lib/api-types";

const asset = (id: string, kind: AssetDto["kind"], name: string, identifier?: string): AssetDto => ({
  id,
  companyId: "c",
  kind,
  name,
  identifier,
  tracking: "passive",
  status: "active",
});
const fleet: WorkerFleetDto = {
  enabled: true,
  operates: true,
  assets: [
    asset("a1", "vehicle", "Ford F-250", "MA 4KJ 882"),
    asset("a2", "machine", "Bobcat S650"),
    asset("a3", "vehicle", "Chevy 1500"),
  ],
  suggestedAssetId: "a1",
};

describe("asset choice", () => {
  it("asks only operators of a company with fleet on and assets", () => {
    expect(shouldPickAsset(fleet)).toBe(true);
    expect(shouldPickAsset({ ...fleet, operates: false })).toBe(false);
    expect(shouldPickAsset({ ...fleet, enabled: false })).toBe(false);
    expect(shouldPickAsset({ ...fleet, assets: [] })).toBe(false);
    expect(shouldPickAsset(null)).toBe(false);
    expect(shouldPickAsset(undefined)).toBe(false);
  });
  it("puts the last asset first and the rest machines before vehicles", () => {
    const { suggested, others } = splitAssetChoice(fleet);
    expect(suggested?.id).toBe("a1");
    expect(others.map((a) => a.id)).toEqual(["a2", "a3"]);
    const none = splitAssetChoice({ ...fleet, suggestedAssetId: undefined });
    expect(none.suggested).toBeUndefined();
    expect(none.others.map((a) => a.id)).toEqual(["a2", "a3", "a1"]);
  });
  it("labels with the plate and falls back to a kind emoji", () => {
    expect(assetLabel(fleet.assets[0]!)).toBe("Ford F-250 · MA 4KJ 882");
    expect(assetLabel(fleet.assets[1]!)).toBe("Bobcat S650");
    expect(assetEmoji({ kind: "vehicle" })).toBe("🛻");
    expect(assetEmoji({ kind: "machine", icon: "crane" })).toBe("🏗️");
  });
});
