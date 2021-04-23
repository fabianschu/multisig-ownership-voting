import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-deploy";
import type { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";

const userConfig: HardhatUserConfig = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    deploy: "deploy",
    sources: "contracts",
  },
  solidity: {
    compilers: [
      { version: "0.6.12" },
      { version: "0.5.17" },
      { version: "0.5.12" },
      { version: "0.8.0" },
    ],
  },
  namedAccounts: {
    alice: 0,
    bob: 1,
    carlos: 2,
    dido: 3,
    eddie: 4,
  },
};

export default userConfig;
