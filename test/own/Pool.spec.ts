import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import * as token from "../../build/artifacts/contracts/balancer/test/TToken.sol/TToken.json";

const [alice, bob, carlos, dido, fred] = waffle.provider.getWallets();

const setupTokens = async () => {
  // mint tokens to alice
  const wethInstance = await waffle.deployContract(alice, token, [
    "Wrapped Ether",
    "WETH",
    18,
  ]);
  const daiInstance = await waffle.deployContract(alice, token, [
    "Dai Stablecoin",
    "DAI",
    18,
  ]);
  console.log("deployment of tokens successful");
  const bPoolInstance = await ethers.getContract("BPool");
  console.log("Minting 50 Ether to Alice");
  await wethInstance.mint(alice.address, ethers.utils.parseEther("50"));
  console.log(await wethInstance.balanceOf(alice.address));
  return { wethInstance, daiInstance };
};

describe("BPool", async () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  describe("#addOwner", () => {
    it("should add a new owner", async () => {
      const { wethInstance, daiInstance } = await setupTokens();
    });
  });
});
