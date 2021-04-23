module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { alice } = await getNamedAccounts();

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

  const { address } = await deploy("BPool", {
    from: alice,
    args: [],
    log: true,
  });

  await deploy("Ballot", {
    from: alice,
    args: [address],
    log: true,
  });
};
module.exports.tags = ["BPool", "Ballot"];
