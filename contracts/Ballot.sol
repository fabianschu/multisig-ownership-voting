// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "./gnosis/GnosisSafe.sol";

contract Ballot{
    GnosisSafe safe;

    function connectSafe() public {
        require(address(safe) == address(0), "B1");
        safe = GnosisSafe(payable(msg.sender));
    }

    function addOwner(address _newOwner, uint _newThreshold) public {
        safe.addOwnerWithThreshold(_newOwner, _newThreshold);
    }
}
