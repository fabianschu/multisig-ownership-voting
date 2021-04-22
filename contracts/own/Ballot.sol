// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "../gnosis/base/OwnerManager.sol";
import "../primeBalancer/interfaces/IBPool.sol";
import "./interfaces/IERC20.sol";

contract Ballot is OwnerManager {
    uint256 constant public MAX_INT = type(uint256).max;
    IERC20 internal bPool;
    mapping(address => uint) public stakes;
    uint public stakedAmount;

    function setupPool(address _bPool) internal {
        bPool = IERC20(_bPool);
    }

    function getTotalVotes() public view returns(uint){
        return bPool.totalSupply();
    }

    function stake() public {
        uint allowance = bPool.allowance(msg.sender, address(this));
        require(allowance == MAX_INT, "B1");

        uint stakerBalance = bPool.balanceOf(msg.sender);
        bool success = bPool.transferFrom(msg.sender, address(this), stakerBalance);
        stakes[msg.sender] = stakerBalance;
        stakedAmount += stakerBalance;
    }
    
    function unstake() public {
        require(stakes[msg.sender] != 0, "B2");
        bPool.transfer(msg.sender, stakes[msg.sender]);
        stakedAmount -= stakes[msg.sender];
        stakes[msg.sender] = 0;
    }
    
    function addOwner(address _newOwner, uint _newThreshold) public {
        addOwnerWithThreshold(_newOwner, _newThreshold);
    }
}
