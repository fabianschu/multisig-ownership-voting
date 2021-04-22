import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import { setupBalancerPool } from "./utils/setup";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const MAX = ethers.constants.MaxUint256;
const firstProposalIdx = 0;
const secondProposalIdx = 1;
const addOwnerProposal = 0;
const removeOwnerProposal = 1;
const openProposal = 1;
const closedProposal = 0;

describe("Ballot", async () => {
  let bPoolinstance: Contract, safeInstance: Contract;
  let alice: SignerWithAddress,
    bob: SignerWithAddress,
    carlos: SignerWithAddress,
    dido: SignerWithAddress,
    eddie: SignerWithAddress;
  let aliceInitialBalance: BigNumber,
    bobInitialBalance: BigNumber,
    carlosInitialBalance: BigNumber,
    didoInitialBalance: BigNumber;

  let type: BigNumber,
    address: string,
    threshold: BigNumber,
    votes: BigNumber,
    status: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();
    ({
      contractInstances: { bPoolinstance },
      users: { alice, bob, carlos, dido, eddie },
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

      it("should revert if caller is not staker", async () => {
        const unstake = safeInstance.unstake();
        await expect(unstake).to.be.revertedWith("B2");
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

      describe("caller has active votes", async () => {
        const newThreshold = 2;
        beforeEach(async () => {
          carlosInitialBalance = await bPoolinstance.balanceOf(carlos.address);
          await bPoolinstance
            .connect(carlos)
            .approve(safeInstance.address, MAX);
          await safeInstance.connect(carlos).stake();
          await safeInstance
            .connect(carlos)
            .addProposal(addOwnerProposal, bob.address, newThreshold);
        });

        it("removes active votes from voter side registery", async () => {
          await safeInstance.connect(carlos).unstake();

          expect(safeInstance.votes(carlos.address, 0)).to.be.reverted;
        });

        it("removes active votes from ONE open proposal", async () => {
          await safeInstance.connect(carlos).unstake();
          [
            type,
            address,
            threshold,
            votes,
            status,
          ] = await safeInstance.proposals(firstProposalIdx);

          expect(votes).to.equal(0);
        });

        it("removes active votes from TWO open proposals", async () => {
          didoInitialBalance = await bPoolinstance.balanceOf(dido.address);
          await bPoolinstance.connect(dido).approve(safeInstance.address, MAX);
          await safeInstance.connect(dido).stake();
          await safeInstance
            .connect(dido)
            .addProposal(addOwnerProposal, bob.address, newThreshold);
          await safeInstance.connect(carlos).vote(secondProposalIdx);
          await safeInstance.connect(carlos).unstake();
          const firstProposal = await safeInstance.proposals(firstProposalIdx);
          const secondProposal = await safeInstance.proposals(
            secondProposalIdx
          );
          expect(firstProposal[3]).to.equal(0);
          expect(secondProposal[3]).to.equal(didoInitialBalance);
        });
      });
    });
  });

  describe("proposing", () => {
    const newThreshold = 2;

    describe("#addProposal", () => {
      it("should revert when proposer is NOT staker", async () => {
        const addProposal = safeInstance.addProposal(
          addOwnerProposal,
          bob.address,
          newThreshold
        );
        await expect(addProposal).to.be.revertedWith("B2");
      });

      describe("when proposer is staker", () => {
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
          ] = await safeInstance.proposals(firstProposalIdx);

          expect(type).to.equal(addOwnerProposal);
          expect(address).to.equal(bob.address);
          expect(threshold).to.equal(newThreshold);
          expect(votes).to.equal(aliceInitialBalance);
          expect(status).to.equal(openProposal);
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

        it("should register proposal as voted by the caller (voter side)", async () => {
          await safeInstance.addProposal(
            addOwnerProposal,
            bob.address,
            newThreshold
          );
          expect(await safeInstance.votes(alice.address, 0)).to.equal(
            firstProposalIdx
          );
        });
      });
    });

    describe("#vote", () => {
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

      // it.only("should revert when caller created proposal", async () => {
      //   await safeInstance.addProposal(
      //     addOwnerProposal,
      //     bob.address,
      //     newThreshold
      //   );
      //   const doubleVote = safeInstance.vote(firstProposalIdx);

      //   await expect(doubleVote).to.be.revertedWith("B5");
      // });

      // it("should revert when proposal is closed", async () => {
      //   const index = 0;
      //   const vote = safeInstance.vote(index);
      //   await expect(vote).to.be.revertedWith("B3");
      // });

      describe("when new vote pushes total votes over threshold", () => {
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

        it("should add the new owner to the safe", async () => {
          expect(await safeInstance.isOwner(bob.address)).to.equal(true);
        });

        it("should set the accepted proposal status to closed", async () => {
          expect(status).to.equal(closedProposal);
        });
      });

      describe("when new vote DOES NOT push total votes over threshold", () => {
        beforeEach(async () => {
          carlosInitialBalance = await bPoolinstance.balanceOf(carlos.address);
          didoInitialBalance = await bPoolinstance.balanceOf(dido.address);
          await bPoolinstance
            .connect(carlos)
            .approve(safeInstance.address, MAX);
          await safeInstance.connect(carlos).stake();
          await safeInstance
            .connect(carlos)
            .addProposal(addOwnerProposal, bob.address, newThreshold);
          await bPoolinstance.connect(dido).approve(safeInstance.address, MAX);
          await safeInstance.connect(dido).stake();
          await safeInstance.connect(dido).vote(firstProposalIdx);
          [
            type,
            address,
            threshold,
            votes,
            status,
          ] = await safeInstance.proposals(firstProposalIdx);
        });

        it("should increase the votes for the proposal", async () => {
          const expectedTotalVotes = carlosInitialBalance.add(
            didoInitialBalance
          );
          expect(votes).to.equal(expectedTotalVotes);
        });

        it("should NOT add the new owner to the safe", async () => {
          expect(await safeInstance.isOwner(bob.address)).to.equal(false);
        });

        it("should set the proposal status to open", async () => {
          expect(status).to.equal(openProposal);
        });

        it("should register that voter has voted for proposal (voter side)", async () => {
          expect(await safeInstance.votes(dido.address, 0)).to.equal(
            firstProposalIdx
          );
        });
      });
    });
  });
});
