// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./OwnerManager.sol";
import "./IBPool.sol";
import "./interfaces/IERC20.sol";

contract Ballot is OwnerManager {

    enum ProposalType { addOwner, removeOwner }
    enum ProposalStatus { closed, open }

    struct Proposal {
        ProposalType proposalType;
        address owner;
        uint votes;
        ProposalStatus proposalStatus;
    }

    event ProposalAdded (uint index, uint proposalType, address target);

    modifier onlyStaker() {
        require(stakes[msg.sender] != 0, "B2");
        _;
    }

    modifier activeProposal(uint _index) {
        require(proposals[_index].owner != address(0), "B3");
        require(proposals[_index].proposalStatus == ProposalStatus.open, "B3");
        _;
    }

    IERC20 internal bPool;
    uint256 constant public MAX_INT = type(uint256).max;    
    uint public stakedAmount;
    uint public numberProposals;
    mapping(address => uint) public stakes;
    mapping(address => uint[]) public votes;
    mapping(uint => Proposal) public proposals;

    constructor(address _bPool) {
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
            if (proposals[openVotes[i]].proposalStatus == ProposalStatus.open) {
                proposals[openVotes[i]].votes -= stakes[msg.sender];
            }
        }
        stakes[msg.sender] = 0;
        votes[msg.sender] = new uint[](0);
    }

    function addProposal(uint _type, address _target) public onlyStaker {
        require(_target != address(0), "B4");
        Proposal memory proposal = Proposal(
            ProposalType(_type),
            _target,
            0,
            ProposalStatus.open
        );
    
        emit ProposalAdded(numberProposals, _type, _target);
        proposals[numberProposals] = proposal;
        vote(numberProposals);
        numberProposals++;
    }

    function vote(uint _index) public onlyStaker activeProposal(_index) {
        require(!hasAlreadyVoted(_index), "B5");

        proposals[_index].votes += stakes[msg.sender];
        if (isMajorityVote(_index)) {
            executeProposal(_index);
        } else {
            votes[msg.sender].push(_index);
        }
    }

    function hasAlreadyVoted(uint _index) internal view returns(bool) {
        for (uint i = 0; i < votes[msg.sender].length; i++) {
            if (votes[msg.sender][i] == _index) {
                return true;
            }
        }
        return false;
    }

    function isMajorityVote(uint _index) public view returns(bool){
        uint total = bPool.totalSupply();
        return proposals[_index].votes * 2 > total;
    }

    function executeProposal(uint _index) public {
        require(isMajorityVote(_index), "B6");

        uint newSafeThreshold = newMultiSigThreshold(proposals[_index].proposalType);
        address elected = proposals[_index].owner;
        if (proposals[_index].proposalType == ProposalType.addOwner) {
            addOwnerWithThreshold(elected, newSafeThreshold);
        } else {
            address[] memory currentOwners = getOwners();
            address prevOwner = SENTINEL_OWNERS;
            address owner;
            for (uint i; i < currentOwners.length; i++) {
                if (currentOwners[i] == proposals[_index].owner) {
                    owner = currentOwners[i];
                    if(i != 0) {
                        prevOwner = currentOwners[i - 1];
                    }
                }
            }
            removeOwner(prevOwner, owner, newSafeThreshold);
        }
        proposals[_index].proposalStatus = ProposalStatus.closed;
    }

    function newMultiSigThreshold(ProposalType _proposalType) internal view returns(uint) {
        uint nextOwnerCount;
        uint nextThreshold = threshold;

        if (_proposalType == ProposalType.addOwner) {
            nextOwnerCount = ownerCount + 1;
            if (threshold * 2 <= nextOwnerCount) {
                nextThreshold++;
            }
        } else if (_proposalType == ProposalType.removeOwner) {
            nextOwnerCount = ownerCount - 1;
            if ((threshold - 1) * 2 > nextOwnerCount) {
                nextThreshold--;
            }
        } 

        require(nextOwnerCount > 0, "B7");

        return nextThreshold; 
    }
}
