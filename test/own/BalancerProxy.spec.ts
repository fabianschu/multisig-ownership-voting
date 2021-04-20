import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
// const [owner, alice, bob] = await ethers.getSigners();
describe("BalancerProxy", async () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  describe("testing things", () => {
    it("lol", async () => {
      const [owner, alice, bob] = await ethers.getSigners();
      const balancerProxyInstance = await ethers.getContract(
        "BalancerProxy",
        owner.address
      );
      console.log(balancerProxyInstance);
    });
  });
});
