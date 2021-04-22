// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "../gnosis/base/OwnerManager.sol";
import "../primeBalancer/interfaces/IBPool.sol";
import "./interfaces/IERC20.sol";

contract Ballot is OwnerManager {
    IERC20 internal bPool;
    mapping(address => uint) public stakes;

    function setupPool(address _bPool) internal {
        bPool = IERC20(_bPool);
    }

    function getTotalVotes() public view returns(uint){
        return bPool.totalSupply();
    }

    function stake() public {
        uint stakerBalance = bPool.balanceOf(msg.sender);
        bool success = bPool.transferFrom(msg.sender, address(this), stakerBalance);
        stakes[msg.sender] = stakerBalance;
    }
    
    function unstake() public {
        require(stakes[msg.sender] != 0, "B1");
        bPool.transfer(msg.sender, stakes[msg.sender]);
    }

    // getAcceptanceThreshold

    // addProposal

    // (check) isAuthorizedProposer

    // 

    // add proposal logic:
    // if proposal to add owner is accepted addOwnerWithThreshold is called
    // if proposal to remove owner is accepted removeOwner is called
    
    function addOwner(address _newOwner, uint _newThreshold) public {
        addOwnerWithThreshold(_newOwner, _newThreshold);
    }
}
