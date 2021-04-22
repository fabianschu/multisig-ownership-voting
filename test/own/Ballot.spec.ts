import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import { setupBalancerPool } from "./utils/setup";

const MAX = ethers.constants.MaxUint256;
// const [owner, alice, bob] = await ethers.getSigners();
describe("Ballot", async () => {
  beforeEach(async () => await deployments.fixture());

  describe("#getTotalVotes", () => {
    it("should get the total number of tokens", async () => {
      const {
        contractInstances: { usdtInstance, daiInstance, bPoolinstance },
        users: { alice, bob, carlos },
      } = await setupBalancerPool();
      const safeInstance = await getSafeWithOwners(
        [alice.address],
        bPoolinstance.address
      );

      expect(await safeInstance.getTotalVotes()).to.equal(
        await bPoolinstance.totalSupply()
      );
    });
  });

  describe("#stakes", () => {
    it("should transfer Alice's token to Ballot", async () => {
      const {
        contractInstances: { usdtInstance, daiInstance, bPoolinstance },
        users: { alice, dido },
      } = await setupBalancerPool();
      const safeInstance = await getSafeWithOwners(
        [alice.address],
        bPoolinstance.address
      );
      const aliceBalance = await bPoolinstance.balanceOf(alice.address);
      await bPoolinstance.approve(safeInstance.address, MAX);

      await safeInstance.stake();
      expect(await bPoolinstance.balanceOf(safeInstance.address)).to.equal(
        aliceBalance
      );
    });

    it("should stake Alice's tokens", async () => {
      const {
        contractInstances: { usdtInstance, daiInstance, bPoolinstance },
        users: { alice, dido },
      } = await setupBalancerPool();
      const safeInstance = await getSafeWithOwners(
        [alice.address],
        bPoolinstance.address
      );
      const aliceBalance = await bPoolinstance.balanceOf(alice.address);
      await bPoolinstance.approve(safeInstance.address, MAX);

      await safeInstance.stake();
      expect(await safeInstance.stakes(alice.address)).to.equal(aliceBalance);
    });
  });
});
