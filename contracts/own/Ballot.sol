// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";
import "../gnosis/base/OwnerManager.sol";
import "../primeBalancer/interfaces/IBPool.sol";
import "./interfaces/IERC20.sol";

contract Ballot is OwnerManager {

    enum ProposalType { addOwner, removeOwner }
    enum ProposalStatus { closed, open }

    struct Proposal {
        ProposalType proposalType;
        address owner;
        uint newThreshold;
        uint votes;
        ProposalStatus proposalStatus;
    }

    event ProposalAdded (uint index, uint proposalType, address target, uint newThreshold);

    modifier onlyStaker() {
        require(stakes[msg.sender] != 0, "B2");
        _;
    }

    IERC20 internal bPool;
    uint256 constant public MAX_INT = type(uint256).max;    
    uint public stakedAmount;
    mapping(address => uint) public stakes;
    uint public numberProposals;
    mapping(uint => Proposal) public proposals;

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
        bPool.transferFrom(msg.sender, address(this), stakerBalance);
        stakes[msg.sender] = stakerBalance;
        stakedAmount += stakerBalance;
    }
    
    function unstake() public onlyStaker {
        bPool.transfer(msg.sender, stakes[msg.sender]);
        stakedAmount -= stakes[msg.sender];
        stakes[msg.sender] = 0;
    }

    function addProposal(uint _type, address _target, uint _newThreshold) public onlyStaker {
        Proposal memory proposal = Proposal(
            ProposalType(_type),
            _target,
            _newThreshold,
            stakes[msg.sender],
            ProposalStatus.open
        );
        emit ProposalAdded(numberProposals, _type, _target, _newThreshold);
        proposals[numberProposals] = proposal;
        numberProposals++;
    }

    function vote(uint _index) public onlyStaker {
        proposals[_index].votes += stakes[msg.sender];
        bool majority = majorityReached(_index);
        if (majority) {
            uint newSafeThreshold = proposals[_index].newThreshold;
            address newOwner = proposals[_index].owner;
            addOwnerWithThreshold(newOwner, newSafeThreshold);
        }
    }

    function majorityReached(uint _index) internal view returns(bool){
        uint votes = proposals[_index].votes;
        uint total = bPool.totalSupply();
        return votes * 2 > total;
    }
}
