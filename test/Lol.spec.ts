import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { setupBalancerPool } from "./utils/setup";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Console } from "node:console";

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

describe("Ballot", () => {
  it("", async () => {
    const {
      contractInstances: { bPoolInstance },
    } = await setupTest();
  });
});
