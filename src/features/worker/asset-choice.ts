import type { AssetDto, AssetIcon, AssetKind, WorkerFleetDto } from "../../lib/api-types";

/* Pure helpers for the Start flow's asset picker (docs/FLEET.md in pugbuild-web). */

/** Same keys and emoji as the web (src/domain/fleet.ts): the pill looks alike on both. */
export const ASSET_ICONS: Record<AssetIcon, string> = {
  pickup: "🛻",
  truck: "🚚",
  semi: "🚛",
  van: "🚐",
  car: "🚗",
  tractor: "🚜",
  excavator: "🏗️",
  crane: "🏗️",
  mixer: "🧱",
  tool: "🔧",
};

export function assetEmoji(asset: { kind: AssetKind; icon?: AssetIcon }): string {
  return ASSET_ICONS[asset.icon ?? (asset.kind === "vehicle" ? "pickup" : "tractor")];
}

/**
 * The picker opens only for operators of a company with fleet on and at least one active asset.
 * Everyone else keeps the one-tap Start. No answer from the server (offline cold start) counts
 * as "no picker": the shift starts, the asset can be added by the office.
 */
export function shouldPickAsset(fleet: WorkerFleetDto | null | undefined): boolean {
  return Boolean(fleet?.enabled && fleet.operates && fleet.assets.length > 0);
}

export interface AssetChoice {
  /** Last shift's asset, offered as the one-tap option. */
  suggested?: AssetDto;
  /** The rest, machines before vehicles, each by name. */
  others: AssetDto[];
}

export function splitAssetChoice(fleet: WorkerFleetDto): AssetChoice {
  const suggested = fleet.assets.find((a) => a.id === fleet.suggestedAssetId);
  const rank = (a: AssetDto) => (a.kind === "machine" ? 0 : 1);
  const others = fleet.assets
    .filter((a) => a.id !== suggested?.id)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return { suggested, others };
}

/** "🛻 Ford F-250 · MA 4KJ 882" for the working view and the picker rows. */
export function assetLabel(asset: AssetDto): string {
  return asset.identifier ? `${asset.name} · ${asset.identifier}` : asset.name;
}
