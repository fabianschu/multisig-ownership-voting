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

    modifier activeProposal(uint _index) {
        require(proposals[_index].owner != address(0), "B3");
        _;
    }

    IERC20 internal bPool;
    uint256 constant public MAX_INT = type(uint256).max;    
    uint public stakedAmount;
    uint public numberProposals;
    mapping(address => uint) public stakes;
    mapping(address => uint[]) public votes;
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
        uint[] memory openVotes = votes[msg.sender];
        for (uint i = 0; i < openVotes.length; i++) {
            proposals[openVotes[i]].votes -= stakes[msg.sender];
        }
        stakes[msg.sender] = 0;
        votes[msg.sender] = new uint[](0);
    }

    function addProposal(uint _type, address _target, uint _newThreshold) public onlyStaker {
        require(_target != address(0), "B4");

        Proposal memory proposal = Proposal(
            ProposalType(_type),
            _target,
            _newThreshold,
            stakes[msg.sender],
            ProposalStatus.open
        );
    
        emit ProposalAdded(numberProposals, _type, _target, _newThreshold);
        proposals[numberProposals] = proposal;
        votes[msg.sender].push(numberProposals);
        numberProposals++;
    }

    function vote(uint _index) public onlyStaker activeProposal(_index) {
        proposals[_index].votes += stakes[msg.sender];
        bool majority = isMajority(_index);
        if (majority) {
            uint newSafeThreshold = proposals[_index].newThreshold;
            address elected = proposals[_index].owner;
            if (proposals[_index].proposalType == ProposalType.addOwner) {
                addOwnerWithThreshold(elected, newSafeThreshold);
            } else {
                //removeOwner
            }
            proposals[_index].proposalStatus = ProposalStatus.closed;
        } else {
            votes[msg.sender].push(_index);
        }
    }

    function isMajority(uint _index) internal view returns(bool){
        uint votes = proposals[_index].votes;
        uint total = bPool.totalSupply();
        return votes * 2 > total;
    }
}
