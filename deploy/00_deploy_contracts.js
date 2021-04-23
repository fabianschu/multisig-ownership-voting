module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { alice } = await getNamedAccounts();

  console.log("Deployer: ", alice);

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
