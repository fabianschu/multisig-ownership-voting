import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import * as token from "../../../build/artifacts/contracts/balancer/test/TToken.sol/TToken.json";
import * as bpool from "../../../build/artifacts/contracts/balancer/BPool.sol/BPool.json";

export const setupBalancerPool = async () => {
  // const [alice, bob, carlos, dido, fred] = waffle.provider.getWallets();
  const [alice, bob, carlos] = await ethers.getSigners();
  const MAX = ethers.constants.MaxUint256;
  // set up token contracts
  const usdtInstance = await waffle.deployContract(alice, token, [
    "USDT Stablecoin",
    "USDT",
    18,
  ]);
  const daiInstance = await waffle.deployContract(alice, token, [
    "Dai Stablecoin",
    "DAI",
    18,
  ]);
  const bPoolinstance = await waffle.deployContract(alice, bpool, []);

  // mint to users
  await usdtInstance.mint(alice.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(alice.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(bob.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(bob.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(carlos.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(carlos.address, ethers.utils.parseEther("10"));

  // approve tokens
  await usdtInstance.approve(bPoolinstance.address, MAX);
  await daiInstance.approve(bPoolinstance.address, MAX);

  // bind BPool with DAI and USDT
  await bPoolinstance.bind(
    usdtInstance.address,
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("5")
  );
  await bPoolinstance.bind(
    daiInstance.address,
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("5")
  );

  // set pool public
  await bPoolinstance.setPublicSwap(true);

  // finalize pool
  await bPoolinstance.finalize();

  // other users authorize pool to transfer tokens
  await usdtInstance.connect(bob).approve(bPoolinstance.address, MAX);
  await daiInstance.connect(bob).approve(bPoolinstance.address, MAX);
  await usdtInstance.connect(carlos).approve(bPoolinstance.address, MAX);
  await daiInstance.connect(carlos).approve(bPoolinstance.address, MAX);

  // bob joins pool
  await bPoolinstance
    .connect(bob)
    .joinPool(ethers.utils.parseEther("5"), [MAX, MAX]);

  // alice joins pool
  await bPoolinstance
    .connect(carlos)
    .joinPool(ethers.utils.parseEther("5"), [MAX, MAX]);

  return {
    contractInstances: { usdtInstance, daiInstance, bPoolinstance },
    users: { alice, bob, carlos },
  };
};
