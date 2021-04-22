import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import { setupBalancerPool } from "./utils/setup";

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
});
