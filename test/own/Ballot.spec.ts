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
  let alice: SignerWithAddress,
    bob: SignerWithAddress,
    carlos: SignerWithAddress,
    dido: SignerWithAddress;
  let aliceInitialBalance: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();
    ({
      contractInstances: { usdtInstance, daiInstance, bPoolinstance },
      users: { alice, bob, carlos, dido },
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
    const addOwnerProposal = 0;
    const removeOwnerProposal = 1;
    const newThreshold = 2;

    describe("#addProposal", () => {
      it("should revert when caller is NOT staker", async () => {
        const addProposal = safeInstance.addProposal(
          addOwnerProposal,
          bob.address,
          newThreshold
        );
        await expect(addProposal).to.be.revertedWith("B2");
      });

      describe("when caller is staker", () => {
        beforeEach(async () => {
          aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
          await bPoolinstance.approve(safeInstance.address, MAX);
          await safeInstance.stake();
        });

        it("should revert if address is 0x00", async () => {
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            ethers.constants.AddressZero,
            newThreshold
          );

          await expect(addProposal).to.be.revertedWith("B4");
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
          const expectedIndex = 0;
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );

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

    describe("#vote", () => {
      let bobInitialBalance: BigNumber;

      beforeEach(async () => {
        aliceInitialBalance = await bPoolinstance.balanceOf(alice.address);
        bobInitialBalance = await bPoolinstance.balanceOf(bob.address);
        await bPoolinstance.approve(safeInstance.address, MAX);
        await safeInstance.stake();
      });

      it("should revert when caller is NOT staker", async () => {
        await safeInstance.addProposal(
          addOwnerProposal,
          bob.address,
          newThreshold
        );
        const index = 0;
        const vote = safeInstance.connect(carlos).vote(index);
        await expect(vote).to.be.revertedWith("B2");
      });

      it("should revert when proposal doesn't exist", async () => {
        const index = 0;
        const vote = safeInstance.vote(index);
        await expect(vote).to.be.revertedWith("B3");
      });

      // it("should revert when proposal is closed", async () => {
      //   const index = 0;
      //   const vote = safeInstance.vote(index);
      //   await expect(vote).to.be.revertedWith("B3");
      // });

      describe("when new vote pushes total votes over threshold", () => {
        const firstProposalIdx = 0;
        let type: BigNumber,
          address: string,
          threshold: BigNumber,
          votes: BigNumber,
          status: BigNumber;

        beforeEach(async () => {
          await safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );
          await bPoolinstance.connect(bob).approve(safeInstance.address, MAX);
          await safeInstance.connect(bob).stake();
          await safeInstance.connect(bob).vote(firstProposalIdx);
          [
            type,
            address,
            threshold,
            votes,
            status,
          ] = await safeInstance.proposals(firstProposalIdx);
        });

        it("should increase the votes for the proposal", async () => {
          const expectedTotalVotes = aliceInitialBalance.add(bobInitialBalance);
          expect(votes).to.equal(expectedTotalVotes);
        });

        it("should add the new owner to the safe if threshold (50% of votes) is met", async () => {
          expect(await safeInstance.isOwner(bob.address)).to.equal(true);
        });

        it("should set the accepted proposal status to closed", async () => {
          expect(status).to.equal(0);
        });
      });
    });
  });
});
