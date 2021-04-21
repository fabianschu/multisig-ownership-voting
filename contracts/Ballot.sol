// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "./gnosis/base/OwnerManager.sol";

contract Ballot is OwnerManager {
    // TODO

    // tie ballot to balancer pool

    // add proposal logic:
    // if proposal to add owner is accepted addOwnerWithThreshold is called
    // if proposal to remove owner is accepted removeOwner is called
    
    function addOwner(address _newOwner, uint _newThreshold) public {
        addOwnerWithThreshold(_newOwner, _newThreshold);
    }
}
