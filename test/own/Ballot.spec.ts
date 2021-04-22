import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import { setupBalancerPool } from "./utils/setup";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

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

  describe("staking the balancer tokens", () => {
    let usdtInstance: Contract,
      daiInstance: Contract,
      bPoolinstance: Contract,
      safeInstance: Contract;
    let alice: SignerWithAddress, dido: SignerWithAddress;
    let aliceInitialBalance: BigNumber;

    beforeEach(async () => {
      ({
        contractInstances: { usdtInstance, daiInstance, bPoolinstance },
        users: { alice, dido },
      } = await setupBalancerPool());
      safeInstance = await getSafeWithOwners(
        [alice.address],
        bPoolinstance.address
      );
      aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
      await bPoolinstance.approve(safeInstance.address, MAX);
    });

    describe("#stake", () => {
      it("should transfer Alice's token to Ballot", async () => {
        await safeInstance.stake();
        expect(await bPoolinstance.balanceOf(safeInstance.address)).to.equal(
          aliceInitialBalance
        );
      });

      it("should stake Alice's tokens", async () => {
        await safeInstance.stake();
        expect(await safeInstance.stakes(alice.address)).to.equal(
          aliceInitialBalance
        );
      });
    });

    describe("#unstake", () => {
      it("should transfer tokens back to Alice if called by Alice", async () => {
        await safeInstance.stake();
        await safeInstance.unstake();
        expect(await bPoolinstance.balanceOf(alice.address)).to.equal(
          aliceInitialBalance
        );
      });

      it.only("should revert if caller is not staker", async () => {
        const unstake = safeInstance.unstake();
        await expect(unstake).to.be.revertedWith("B1");
      });

      // it("should stake Alice's tokens", async () => {
      //   const {
      //     contractInstances: { usdtInstance, daiInstance, bPoolinstance },
      //     users: { alice, dido },
      //   } = await setupBalancerPool();
      //   const safeInstance = await getSafeWithOwners(
      //     [alice.address],
      //     bPoolinstance.address
      //   );
      //   const aliceBalance = await bPoolinstance.balanceOf(alice.address);
      //   await bPoolinstance.approve(safeInstance.address, MAX);
      //   await safeInstance.stake();
      //   expect(await safeInstance.stakes(alice.address)).to.equal(aliceBalance);
      // });
    });
  });
});
