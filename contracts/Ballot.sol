// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "./gnosis/base/OwnerManager.sol";
// import "./balancer/BPool.sol"

contract Ballot is OwnerManager {
    // BPool bPool;
    // TODO

    // tie ballot to balancer poo

    function setupBalancerPool(address _balancerPool) internal {
        // bPool = BPool(_balancerPool);
        // console.log("I SET THE BALANCER POOL :)")
    }

    // add proposal logic:
    // if proposal to add owner is accepted addOwnerWithThreshold is called
    // if proposal to remove owner is accepted removeOwner is called

    function addOwner(address _newOwner, uint _newThreshold) public {
        addOwnerWithThreshold(_newOwner, _newThreshold);
    }
}
