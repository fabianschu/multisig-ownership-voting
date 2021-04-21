import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import { getSafeWithOwners } from "../gnosis/utils/setup";
import * as token from "../../build/artifacts/contracts/balancer/test/TToken.sol/TToken.json";
import * as bpool from "../../build/artifacts/contracts/balancer/BPool.sol/BPool.json";

const setupTokens = async () => {
  // const [alice, bob, carlos, dido, fred] = waffle.provider.getWallets();
  const [alice, bob, carlos] = await ethers.getSigners();
  const MAX = ethers.constants.MaxUint256;
  // set up token contracts
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
  const bPoolinstance = await waffle.deployContract(alice, bpool, []);

  // mint to users
  await wethInstance.mint(alice.address, ethers.utils.parseEther("50"));
  await daiInstance.mint(alice.address, ethers.utils.parseEther("10000"));
  await wethInstance.mint(bob.address, ethers.utils.parseEther("25"));
  await daiInstance.mint(bob.address, ethers.utils.parseEther("5000"));
  await wethInstance.mint(carlos.address, ethers.utils.parseEther("100"));
  await daiInstance.mint(carlos.address, ethers.utils.parseEther("200000"));

  // approve tokens
  await wethInstance.approve(bPoolinstance.address, MAX);
  await daiInstance.approve(bPoolinstance.address, MAX);

  // bind BPool with DAI and WETH
  await bPoolinstance.bind(
    wethInstance.address,
    ethers.utils.parseEther("50"),
    ethers.utils.parseEther("5")
  );
  await bPoolinstance.bind(
    daiInstance.address,
    ethers.utils.parseEther("10000"),
    ethers.utils.parseEther("5")
  );

  // set pool public
  await bPoolinstance.setPublicSwap(true);

  // finalize pool
  await bPoolinstance.finalize();

  // other users authorize pool to transfer tokens
  await wethInstance.connect(bob).approve(bPoolinstance.address, MAX);
  await daiInstance.connect(bob).approve(bPoolinstance.address, MAX);
  await wethInstance.connect(carlos).approve(bPoolinstance.address, MAX);
  await daiInstance.connect(carlos).approve(bPoolinstance.address, MAX);

  console.log(await bPoolinstance.balanceOf(bob.address));
  // bob joins pool
  await bPoolinstance
    .connect(bob)
    .joinPool(ethers.utils.parseEther("5"), [MAX, MAX]);

  console.log(await bPoolinstance.balanceOf(bob.address));
  return { wethInstance, daiInstance, bPoolinstance };
};

describe("BPool", async () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  describe("#addOwner", () => {
    it("should add a new owner", async () => {
      await setupTokens();
      // const { wethInstance, daiInstance } = await setupTokens();
    });
  });
});
