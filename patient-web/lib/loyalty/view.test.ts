import { describe, expect, it } from "vitest";
import { parseAccount, parseChallenges, parseConfig, parseOffers, parseReferrals, parseRewards, parseTransactions, pickLoyaltyTab, tierProgress } from "./view";

/** Batch 11: what the loyalty hub and the offers read. Every value is a TEST value. Nothing is invented: no default target, no end date. */
describe("loyalty readers", () => {
  it("reads the balance and the tier", () => {
    expect(parseAccount({ points: 120, tier: "silver" })).toEqual({ points: 120, tier: "silver" });
    expect(parseAccount(null)).toEqual({ points: 0, tier: undefined });
  });

  it("reads only well-formed tiers and ways to earn; no tiers stays empty (the page then says unavailable)", () => {
    const config = parseConfig({ tiers: [{ id: "a", label: "Test A", minPts: 0, perks: ["p1", 3] }, { label: "no id", minPts: 5 }], earn_ways: [{ action: "Test way", pts: 10 }, { pts: 1 }] });
    expect(config.tiers).toEqual([{ id: "a", label: "Test A", minPts: 0, perks: ["p1"] }]);
    expect(config.earnWays).toEqual([{ action: "Test way", points: 10 }]);
    expect(parseConfig({}).tiers).toEqual([]);
  });

  it("measures the way to the next tier", () => {
    const tiers = [{ id: "a", label: "A", minPts: 0, perks: [] }, { id: "b", label: "B", minPts: 1000, perks: [] }];
    expect(tierProgress(tiers, "a", 250)).toMatchObject({ share: 0.25, missing: 750 });
    expect(tierProgress(tiers, "b", 5000)).toMatchObject({ share: 1, missing: 0 });
    expect(tierProgress(tiers, "unknown", 0).current?.id).toBe("a");
  });

  it("reads history rows by their signed points and skips zero rows", () => {
    expect(parseTransactions({ transactions: [{ id: "t1", points_delta: -50, reason: "reward_claimed" }, { id: "t2", points_delta: 0 }] })).toEqual([{ id: "t1", delta: -50, reason: "reward_claimed", description: undefined, createdAt: undefined }]);
  });

  it("reads rewards, and challenges without a default target or end date", () => {
    expect(parseRewards([{ id: "r1", title: "Test reward", points_required: 300 }, { id: "r2", title: "no cost" }])).toEqual([{ id: "r1", title: "Test reward", description: undefined, pointsRequired: 300 }]);
    const [c] = parseChallenges([{ id: "c1", title: "Test", reward_points: 20, user_progress: 2 }]);
    expect(c).toMatchObject({ joined: true, completed: false, progress: 2, total: undefined, endDate: undefined });
  });

  it("reads the referral code, stats and invites", () => {
    expect(parseReferrals({ code: "TEST42", stats: { total: 2, earned_points: 100 }, invites: [{ id: "i1", name: "Test", status: "rewarded" }] })).toMatchObject({ code: "TEST42", earned: 100, total: 2, invites: [{ id: "i1", rewarded: true }] });
  });

  it("falls back to the first tab for a stale value", () => {
    expect(pickLoyaltyTab("invite")).toBe("invite");
    expect(pickLoyaltyTab("leaderboard")).toBe("rewards");
    expect(pickLoyaltyTab(undefined)).toBe("rewards");
  });
});

describe("offer rows", () => {
  it("reads the fields GET /home/offers sends and drops a discount the server could not compute", () => {
    const [a, b] = parseOffers([{ id: "o1", t: "Test offer", prov: "Test clinic", disc: "20%", price: 80, old: 100, rating: 4.5, sponsored: true }, { id: "o2", t: "Test 2", disc: "NaN%", price: 10 }]);
    expect(a).toMatchObject({ title: "Test offer", provider: "Test clinic", discount: "20%", price: 80, oldPrice: 100, rating: 4.5, sponsored: true });
    expect(b.discount).toBeUndefined();
    expect(parseOffers([{ id: "x" }])).toEqual([]);
  });
});
