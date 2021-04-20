import { expect } from "chai";
import hre, { deployments, waffle, ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import {
  compile,
  getCreateCall,
  getSafeWithOwners,
} from "../gnosis/utils/setup";
import { executeContractCallWithSigners } from "../../src/utils/execution";

// const [owner, alice, bob] = await ethers.getSigners();
describe("Ballot", async () => {
  const [alice, bob, carlos, dido, fred] = waffle.provider.getWallets();

  beforeEach(async () => await deployments.fixture());

  describe("#addOwner", () => {
    it("should add a new owner", async () => {
      const ballot = await ethers.getContract("Ballot");
      const safe = await getSafeWithOwners([alice.address], ballot.address);
      await ballot.addOwner(bob.address, 1);
      expect(await safe.isOwner(bob.address)).to.equal(true);
    });
  });
});
