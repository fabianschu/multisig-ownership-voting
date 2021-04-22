import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import { setupBalancerPool } from "./utils/setup";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const MAX = ethers.constants.MaxUint256;
// const [owner, alice, bob] = await ethers.getSigners();
describe("Ballot", async () => {
  let usdtInstance: Contract,
    daiInstance: Contract,
    bPoolinstance: Contract,
    safeInstance: Contract;
  let alice: SignerWithAddress, bob: SignerWithAddress, dido: SignerWithAddress;
  let aliceInitialBalance: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();
    ({
      contractInstances: { usdtInstance, daiInstance, bPoolinstance },
      users: { alice, bob, dido },
    } = await setupBalancerPool());
    safeInstance = await getSafeWithOwners(
      [alice.address],
      bPoolinstance.address
    );
  });

  describe("staking", () => {
    describe("#stake", () => {
      describe("without approval", () => {
        it("should revert if approval for MAX uint is missing", async () => {
          const stake = safeInstance.stake();
          await expect(stake).to.be.revertedWith("B1");
        });
      });

      describe("with approval", () => {
        beforeEach(async () => {
          aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
          await bPoolinstance.approve(safeInstance.address, MAX);
        });

        it("should transfer Alice's token to Ballot", async () => {
          await safeInstance.stake();
          expect(await bPoolinstance.balanceOf(safeInstance.address)).to.equal(
            aliceInitialBalance
          );
        });

        it("should update the register of stakes", async () => {
          await safeInstance.stake();
          expect(await safeInstance.stakes(alice.address)).to.equal(
            aliceInitialBalance
          );
        });

        it("should increase the staked amount", async () => {
          await safeInstance.stake();
          expect(await safeInstance.stakedAmount()).to.equal(
            aliceInitialBalance
          );
        });
      });
    });

    describe("#unstake", () => {
      beforeEach(async () => {
        aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
        await bPoolinstance.approve(safeInstance.address, MAX);
      });

      describe("caller is NOT staker", () => {
        it("should revert if caller is not staker", async () => {
          const unstake = safeInstance.unstake();
          await expect(unstake).to.be.revertedWith("B2");
        });
      });

      describe("caller is staker", () => {
        beforeEach(async () => {
          await safeInstance.stake();
          await safeInstance.unstake();
        });

        it("should transfer tokens back to Alice if called by Alice", async () => {
          expect(await bPoolinstance.balanceOf(alice.address)).to.equal(
            aliceInitialBalance
          );
        });

        it("should update the register of stakes", async () => {
          expect(await safeInstance.stakes(alice.address)).to.equal(0);
        });

        it("should decrease the staked amount", async () => {
          expect(await safeInstance.stakedAmount()).to.equal(0);
        });
      });
    });
  });

  describe("proposing", () => {
    describe("#addProposal", () => {
      const addOwnerProposal = 0;
      const removeOwnerProposal = 1;
      const newThreshold = 2;

      describe("when caller is NOT staker", () => {
        it("should revert", async () => {
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );
          await expect(addProposal).to.be.revertedWith("B2");
        });
      });

      describe("when caller is staker", () => {
        beforeEach(async () => {
          aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
          await bPoolinstance.approve(safeInstance.address, MAX);
          await safeInstance.stake();
        });

        it("should add a proposal", async () => {
          await safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );
          const [
            type,
            address,
            threshold,
            votes,
            status,
          ] = await safeInstance.proposals(0);
          const proposalStatusOpen = 1;

          expect(type).to.equal(addOwnerProposal);
          expect(address).to.equal(bob.address);
          expect(threshold).to.equal(newThreshold);
          expect(votes).to.equal(aliceInitialBalance);
          expect(status).to.equal(proposalStatusOpen);
        });

        it("should increment the number of proposals", async () => {
          await safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );

          expect(await safeInstance.numberProposals()).to.equal(1);
        });

        it("should emit an event", async () => {
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );
          const expectedIndex = 0;

          await expect(addProposal)
            .to.emit(safeInstance, "ProposalAdded")
            .withArgs(
              expectedIndex,
              addOwnerProposal,
              bob.address,
              newThreshold
            );
        });
      });
    });
  });

  describe("voting", () => {
    describe("when caller is NOT staker", () => {
      it("should revert", async () => {
        // const addProposal = safeInstance.addProposal(
        //   addOwnerProposal,
        //   bob.address
        // );
        // await expect(addProposal).to.be.revertedWith("B2");
      });
    });
  });
});
