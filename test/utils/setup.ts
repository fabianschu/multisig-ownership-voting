import { expect } from "chai";
import { deployments, waffle, ethers } from "hardhat";
import * as token from "../../build/artifacts/contracts/balancer/test/TToken.sol/TToken.json";
import * as bpool from "../../build/artifacts/contracts/balancer/BPool.sol/BPool.json";

export const setupBalancerPool = async () => {
  const [alice, bob, carlos, dido, eddie] = await ethers.getSigners();

  const MAX = ethers.constants.MaxUint256;
  // set up token contracts
  const bPoolInstance = await ethers.getContract("BPool", alice);
  const usdtInstance = await ethers.getContract("USDT", alice);
  const daiInstance = await ethers.getContract("DAI", alice);

  // mint to users
  await usdtInstance.mint(alice.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(alice.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(bob.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(bob.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(carlos.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(carlos.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(dido.address, ethers.utils.parseEther("10"));
  await daiInstance.mint(dido.address, ethers.utils.parseEther("10"));
  await usdtInstance.mint(eddie.address, ethers.utils.parseEther("100"));
  await daiInstance.mint(eddie.address, ethers.utils.parseEther("100"));

  // approve tokens by admin (alice)
  await usdtInstance.approve(bPoolInstance.address, MAX);
  await daiInstance.approve(bPoolInstance.address, MAX);

  // bind BPool with DAI and USDT
  await bPoolInstance.bind(
    usdtInstance.address,
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("5")
  );
  await bPoolInstance.bind(
    daiInstance.address,
    ethers.utils.parseEther("10"),
    ethers.utils.parseEther("5")
  );

  // set pool public
  await bPoolInstance.setPublicSwap(true);

  // finalize pool
  await bPoolInstance.finalize();

  // other users authorize pool to transfer tokens
  await usdtInstance.connect(bob).approve(bPoolInstance.address, MAX);
  await daiInstance.connect(bob).approve(bPoolInstance.address, MAX);
  await usdtInstance.connect(carlos).approve(bPoolInstance.address, MAX);
  await daiInstance.connect(carlos).approve(bPoolInstance.address, MAX);
  await usdtInstance.connect(dido).approve(bPoolInstance.address, MAX);
  await daiInstance.connect(dido).approve(bPoolInstance.address, MAX);
  await usdtInstance.connect(eddie).approve(bPoolInstance.address, MAX);
  await daiInstance.connect(eddie).approve(bPoolInstance.address, MAX);

  // bob joins pool
  await bPoolInstance
    .connect(bob)
    .joinPool(ethers.utils.parseEther("100"), [MAX, MAX]);

  // alice joins pool
  await bPoolInstance
    .connect(carlos)
    .joinPool(ethers.utils.parseEther("50"), [MAX, MAX]);

  await bPoolInstance
    .connect(dido)
    .joinPool(ethers.utils.parseEther("50"), [MAX, MAX]);

  return {
    bPoolInstance,
  };
};
