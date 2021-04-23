module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { alice } = await getNamedAccounts();

  console.log("Deployer: ", alice);

  await deploy("USDT", {
    from: alice,
    contract: "TToken",
    args: ["USDT Stablecoin", "USDT", 18],
    log: true,
  });

  await deploy("DAI", {
    from: alice,
    contract: "TToken",
    args: ["Dai Stablecoin", "DAI", 18],
    log: true,
  });

  await deploy("BPool", {
    from: alice,
    args: [],
    log: true,
  });

  await deploy("Ballot", {
    from: alice,
    args: [],
    log: true,
  });
};
module.exports.tags = ["BPool", "Ballot"];
