import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { setupBalancerPool } from "./utils/setup";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const MAX = ethers.constants.MaxUint256;
const MIN = ethers.constants.Zero;
const firstProposalIdx = 0;
const secondProposalIdx = 1;
const addOwnerProposal = 0;
const removeOwnerProposal = 1;
const openProposal = 1;
const closedProposal = 0;

const setupTest = deployments.createFixture(
  async ({ deployments, ethers }, options) => {
    await deployments.fixture();
    const [alice, bob, carlos, dido, eddie] = await ethers.getSigners();

    const { bPoolInstance } = await setupBalancerPool();

    const safeInstance = await ethers.getContract("Ballot", alice);

    return {
      users: { alice, bob, carlos, dido, eddie },
      contractInstances: { bPoolInstance, safeInstance },
    };
  }
);

describe("Ballot", async () => {
  let bPoolInstance: Contract, safeInstance: Contract;
  let alice: SignerWithAddress,
    bob: SignerWithAddress,
    carlos: SignerWithAddress,
    dido: SignerWithAddress,
    eddie: SignerWithAddress;
  let aliceInitialBalance: BigNumber,
    bobInitialBalance: BigNumber,
    carlosInitialBalance: BigNumber,
    eddieInitialBalance: BigNumber,
    didoInitialBalance: BigNumber;
  let type: BigNumber,
    address: string,
    threshold: BigNumber,
    votes: BigNumber,
    status: BigNumber;

  beforeEach(async () => {
    ({
      users: { alice, bob, carlos, dido, eddie },
      contractInstances: { bPoolInstance, safeInstance },
    } = await setupTest());
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
          aliceInitialBalance = await bPoolInstance.balanceOf(alice.address);
          await bPoolInstance.approve(safeInstance.address, MAX);
        });

        it("should transfer Alice's token to Ballot", async () => {
          await safeInstance.stake();
          expect(await bPoolInstance.balanceOf(safeInstance.address)).to.equal(
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
        aliceInitialBalance = await bPoolInstance.balanceOf(alice.address);
        await bPoolInstance.approve(safeInstance.address, MAX);
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
          expect(await bPoolInstance.balanceOf(alice.address)).to.equal(
            aliceInitialBalance
          );
        });

        it("should update the registery of stakes", async () => {
          expect(await safeInstance.stakes(alice.address)).to.equal(0);
        });

        it("should decrease the staked amount", async () => {
          expect(await safeInstance.stakedAmount()).to.equal(0);
        });
      });

      describe("caller has active votes", async () => {
        beforeEach(async () => {
          carlosInitialBalance = await bPoolInstance.balanceOf(carlos.address);
          await bPoolInstance
            .connect(carlos)
            .approve(safeInstance.address, MAX);
          await safeInstance.connect(carlos).stake();
          await safeInstance
            .connect(carlos)
            .addProposal(addOwnerProposal, bob.address);
        });

        it("should remove active votes from voter side registery", async () => {
          await safeInstance.connect(carlos).unstake();

          expect(safeInstance.votes(carlos.address, 0)).to.be.reverted;
        });

        it("should remove active votes from ONE open proposal", async () => {
          await safeInstance.connect(carlos).unstake();
          [type, address, votes, status] = await safeInstance.proposals(
            firstProposalIdx
          );

          expect(votes).to.equal(0);
        });

        it("should remove active votes from TWO open proposals", async () => {
          didoInitialBalance = await bPoolInstance.balanceOf(dido.address);
          await bPoolInstance.connect(dido).approve(safeInstance.address, MAX);
          await safeInstance.connect(dido).stake();
          await safeInstance
            .connect(dido)
            .addProposal(addOwnerProposal, bob.address);
          await safeInstance.connect(carlos).vote(secondProposalIdx);
          await safeInstance.connect(carlos).unstake();
          const [
            firstType,
            firstAddress,
            firstVotes,
            firstStatus,
          ] = await safeInstance.proposals(firstProposalIdx);
          const [
            secondType,
            secondAddress,
            secondVotes,
            secondStatus,
          ] = await safeInstance.proposals(secondProposalIdx);
          expect(firstVotes).to.equal(0);
          expect(secondVotes).to.equal(didoInitialBalance);
        });

        it("should NOT remove active votes from closed proposal", async () => {
          aliceInitialBalance = await bPoolInstance.balanceOf(alice.address);
          bobInitialBalance = await bPoolInstance.balanceOf(bob.address);
          await safeInstance.stake();
          await bPoolInstance.connect(bob).approve(safeInstance.address, MAX);
          await safeInstance.connect(bob).stake();
          await safeInstance.vote(firstProposalIdx);
          await safeInstance.connect(bob).vote(firstProposalIdx);
          await safeInstance.connect(carlos).unstake();
          [type, address, votes, status] = await safeInstance.proposals(
            firstProposalIdx
          );

          expect(votes).to.equal(
            aliceInitialBalance.add(bobInitialBalance).add(carlosInitialBalance)
          );
        });
      });
    });
  });

  describe("proposing/voting process", () => {
    describe("#addProposal", () => {
      it("should revert when proposer is NOT staker", async () => {
        const addProposal = safeInstance.addProposal(
          addOwnerProposal,
          bob.address
        );
        await expect(addProposal).to.be.revertedWith("B2");
      });

      describe("when proposer is staker", () => {
        beforeEach(async () => {
          aliceInitialBalance = await bPoolInstance.balanceOf(alice.address);
          await bPoolInstance.approve(safeInstance.address, MAX);
          await safeInstance.stake();
        });

        it("should revert if address is 0x00", async () => {
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            ethers.constants.AddressZero
          );

          await expect(addProposal).to.be.revertedWith("B4");
        });

        it("should add a proposal", async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);
          const [type, address, votes, status] = await safeInstance.proposals(
            firstProposalIdx
          );

          expect(type).to.equal(addOwnerProposal);
          expect(address).to.equal(bob.address);
          expect(votes).to.equal(aliceInitialBalance);
          expect(status).to.equal(openProposal);
        });

        it("should increment the number of proposals", async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);

          expect(await safeInstance.numberProposals()).to.equal(1);
        });

        it("should emit an event", async () => {
          const expectedIndex = 0;
          const addProposal = safeInstance.addProposal(
            addOwnerProposal,
            bob.address
          );

          await expect(addProposal)
            .to.emit(safeInstance, "ProposalAdded")
            .withArgs(expectedIndex, addOwnerProposal, bob.address);
        });

        it("should register proposal as voted by the caller (voter side)", async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);
          expect(await safeInstance.votes(alice.address, 0)).to.equal(
            firstProposalIdx
          );
        });
      });

      describe("when proposer is majority staker", async () => {
        beforeEach(async () => {
          eddieInitialBalance = await bPoolInstance.balanceOf(eddie.address);
          await bPoolInstance
            .connect(eddie)
            .joinPool(ethers.utils.parseEther("400"), [MAX, MAX]);
          await bPoolInstance.connect(eddie).approve(safeInstance.address, MAX);
          await safeInstance.connect(eddie).stake();
          await safeInstance
            .connect(eddie)
            .addProposal(addOwnerProposal, bob.address);
        });

        it("should immediately add new owner", async () => {
          expect(await safeInstance.isOwner(bob.address)).to.equal(true);
        });
      });
    });

    describe("#vote", () => {
      beforeEach(async () => {
        aliceInitialBalance = await bPoolInstance.balanceOf(alice.address);
        bobInitialBalance = await bPoolInstance.balanceOf(bob.address);
        await bPoolInstance.approve(safeInstance.address, MAX);
        await safeInstance.stake();
      });

      describe("addOwner proposal", () => {
        it("should revert when caller is NOT staker", async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);
          const index = 0;
          const vote = safeInstance.connect(carlos).vote(index);
          await expect(vote).to.be.revertedWith("B2");
        });

        it("should revert when proposal doesn't exist", async () => {
          const index = 0;
          const vote = safeInstance.vote(index);
          await expect(vote).to.be.revertedWith("B3");
        });

        it("should revert when voter also created proposal (double vote)", async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);
          const doubleVote = safeInstance.vote(firstProposalIdx);

          await expect(doubleVote).to.be.revertedWith("B5");
        });

        describe("when new vote pushes total votes over threshold", () => {
          beforeEach(async () => {
            await safeInstance.addProposal(addOwnerProposal, bob.address);
            await bPoolInstance.connect(bob).approve(safeInstance.address, MAX);
            await safeInstance.connect(bob).stake();
            await safeInstance.connect(bob).vote(firstProposalIdx);
            [type, address, votes, status] = await safeInstance.proposals(
              firstProposalIdx
            );
          });

          it("should increase the votes for the proposal", async () => {
            const expectedTotalVotes = aliceInitialBalance.add(
              bobInitialBalance
            );
            expect(votes).to.equal(expectedTotalVotes);
          });

          it("should add the new owner to the safe", async () => {
            expect(await safeInstance.isOwner(bob.address)).to.equal(true);
          });

          it("should set the accepted proposal status to closed", async () => {
            expect(status).to.equal(closedProposal);
          });

          it("should revert additional voting attempts", async () => {
            await bPoolInstance
              .connect(carlos)
              .approve(safeInstance.address, MAX);

            await safeInstance.connect(carlos).stake();
            const closedVote = safeInstance
              .connect(carlos)
              .vote(firstProposalIdx);
            expect(closedVote).to.be.revertedWith("B3");
          });
        });

        describe("when new vote DOES NOT push total votes over threshold", () => {
          beforeEach(async () => {
            carlosInitialBalance = await bPoolInstance.balanceOf(
              carlos.address
            );
            didoInitialBalance = await bPoolInstance.balanceOf(dido.address);
            await bPoolInstance
              .connect(carlos)
              .approve(safeInstance.address, MAX);
            await safeInstance.connect(carlos).stake();
            await safeInstance
              .connect(carlos)
              .addProposal(addOwnerProposal, bob.address);
            await bPoolInstance
              .connect(dido)
              .approve(safeInstance.address, MAX);
            await safeInstance.connect(dido).stake();
            await safeInstance.connect(dido).vote(firstProposalIdx);
            [type, address, votes, status] = await safeInstance.proposals(
              firstProposalIdx
            );
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

      describe("removeOwner proposal", () => {
        beforeEach(async () => {
          await safeInstance.addProposal(addOwnerProposal, bob.address);
          await bPoolInstance.connect(bob).approve(safeInstance.address, MAX);
          await safeInstance.connect(bob).stake();
          await safeInstance.connect(bob).vote(firstProposalIdx);
        });

        it("should remove OG owner (alice) from safe", async () => {
          await safeInstance.addProposal(removeOwnerProposal, alice.address);
          await safeInstance.connect(bob).vote(secondProposalIdx);
          [type, address, votes, status] = await safeInstance.proposals(
            firstProposalIdx
          );
          const owners = await safeInstance.getOwners();
          expect(owners.length).to.equal(1);
          expect(owners[0]).to.equal(bob.address);
        });

        it("should remove new owner (bob) from safe", async () => {
          await safeInstance.addProposal(removeOwnerProposal, bob.address);
          await safeInstance.connect(bob).vote(secondProposalIdx);
          [type, address, votes, status] = await safeInstance.proposals(
            firstProposalIdx
          );
          const owners = await safeInstance.getOwners();
          expect(owners.length).to.equal(1);
          expect(owners[0]).to.equal(alice.address);
        });
      });
    });

    describe("#executeProposal", () => {
      beforeEach(async () => {
        eddieInitialBalance = await bPoolInstance.balanceOf(eddie.address);
        await bPoolInstance.approve(safeInstance.address, MAX);
        await safeInstance.stake();
        await bPoolInstance
          .connect(eddie)
          .joinPool(ethers.utils.parseEther("300"), [MAX, MAX]);
        await bPoolInstance.connect(bob).approve(safeInstance.address, MAX);
        await safeInstance.connect(bob).stake();
        await safeInstance.addProposal(addOwnerProposal, bob.address);
        await safeInstance.connect(bob).vote(firstProposalIdx);
      });

      it("should revert if there is no majority", async () => {
        const executeProposal = safeInstance.executeProposal(firstProposalIdx);
        await expect(executeProposal).to.be.revertedWith("B6");
      });

      it("should add the owner if there is a majority", async () => {
        await bPoolInstance
          .connect(eddie)
          .exitPool(ethers.utils.parseEther("300"), [MIN, MIN]);
        const executeProposal = safeInstance.executeProposal(firstProposalIdx);
        expect(await safeInstance.isOwner(bob.address)).to.equal(true);
      });
    });
  });
});
