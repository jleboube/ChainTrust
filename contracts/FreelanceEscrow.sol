// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FreelanceEscrow is Ownable, ReentrancyGuard {
    
    enum EscrowStatus {
        Created,
        Funded,
        WorkSubmitted,
        Completed,
        Disputed,
        Cancelled,
        Refunded
    }
    
    struct EscrowContract {
        uint256 id;
        address client;
        address freelancer;
        address mediator;
        uint256 amount;
        address token; // ERC20 token address (address(0) for ETH)
        EscrowStatus status;
        uint256 deadline;
        string workDescription;
        string deliveryHash; // IPFS hash of delivered work
        uint256 createdAt;
        uint256 lastUpdated;
        bool clientApproved;
        bool freelancerSubmitted;
    }
    
    mapping(uint256 => EscrowContract) public escrows;
    mapping(address => uint256[]) public clientEscrows;
    mapping(address => uint256[]) public freelancerEscrows;
    
    uint256 public nextEscrowId = 1;
    uint256 public platformFee = 250; // 2.5% in basis points
    address public feeRecipient;
    mapping(address => bool) public approvedMediators;
    
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        address token
    );
    
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event WorkSubmitted(uint256 indexed escrowId, string deliveryHash);
    event WorkApproved(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId, address raisedBy);
    event DisputeResolved(uint256 indexed escrowId, address winner, uint256 clientAmount, uint256 freelancerAmount);
    event EscrowCompleted(uint256 indexed escrowId, uint256 freelancerPayout, uint256 platformFee);
    event EscrowCancelled(uint256 indexed escrowId);
    
    modifier onlyParties(uint256 _escrowId) {
        EscrowContract memory escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.client || 
            msg.sender == escrow.freelancer,
            "Only client or freelancer can call this"
        );
        _;
    }
    
    modifier onlyClient(uint256 _escrowId) {
        require(escrows[_escrowId].client == msg.sender, "Only client can call this");
        _;
    }
    
    modifier onlyFreelancer(uint256 _escrowId) {
        require(escrows[_escrowId].freelancer == msg.sender, "Only freelancer can call this");
        _;
    }
    
    modifier onlyMediator(uint256 _escrowId) {
        require(escrows[_escrowId].mediator == msg.sender, "Only assigned mediator can call this");
        _;
    }
    
    modifier validEscrow(uint256 _escrowId) {
        require(_escrowId < nextEscrowId, "Escrow does not exist");
        _;
    }
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    function createEscrow(
        address _freelancer,
        address _mediator,
        uint256 _amount,
        address _token,
        uint256 _deadline,
        string memory _workDescription
    ) external returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(approvedMediators[_mediator] || _mediator == owner(), "Invalid mediator");
        
        uint256 escrowId = nextEscrowId++;
        
        EscrowContract storage newEscrow = escrows[escrowId];
        newEscrow.id = escrowId;
        newEscrow.client = msg.sender;
        newEscrow.freelancer = _freelancer;
        newEscrow.mediator = _mediator;
        newEscrow.amount = _amount;
        newEscrow.token = _token;
        newEscrow.status = EscrowStatus.Created;
        newEscrow.deadline = _deadline;
        newEscrow.workDescription = _workDescription;
        newEscrow.createdAt = block.timestamp;
        newEscrow.lastUpdated = block.timestamp;
        
        clientEscrows[msg.sender].push(escrowId);
        freelancerEscrows[_freelancer].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, _freelancer, _amount, _token);
        
        return escrowId;
    }
    
    function fundEscrow(uint256 _escrowId) 
        external 
        payable 
        validEscrow(_escrowId) 
        onlyClient(_escrowId) 
        nonReentrant 
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Created, "Escrow already funded or completed");
        
        if (escrow.token == address(0)) {
            // ETH payment
            require(msg.value == escrow.amount, "Incorrect ETH amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "Do not send ETH for token payments");
            IERC20(escrow.token).transferFrom(msg.sender, address(this), escrow.amount);
        }
        
        escrow.status = EscrowStatus.Funded;
        escrow.lastUpdated = block.timestamp;
        
        emit EscrowFunded(_escrowId, escrow.amount);
    }
    
    function submitWork(uint256 _escrowId, string memory _deliveryHash) 
        external 
        validEscrow(_escrowId) 
        onlyFreelancer(_escrowId) 
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Funded, "Escrow not funded");
        require(block.timestamp <= escrow.deadline, "Deadline passed");
        require(bytes(_deliveryHash).length > 0, "Delivery hash required");
        
        escrow.deliveryHash = _deliveryHash;
        escrow.freelancerSubmitted = true;
        escrow.status = EscrowStatus.WorkSubmitted;
        escrow.lastUpdated = block.timestamp;
        
        emit WorkSubmitted(_escrowId, _deliveryHash);
    }
    
    function approveWork(uint256 _escrowId) 
        external 
        validEscrow(_escrowId) 
        onlyClient(_escrowId) 
        nonReentrant 
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.WorkSubmitted, "Work not submitted");
        
        escrow.clientApproved = true;
        escrow.status = EscrowStatus.Completed;
        escrow.lastUpdated = block.timestamp;
        
        _releasePayment(_escrowId);
        
        emit WorkApproved(_escrowId);
    }
    
    function raiseDispute(uint256 _escrowId) 
        external 
        validEscrow(_escrowId) 
        onlyParties(_escrowId) 
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(
            escrow.status == EscrowStatus.Funded || 
            escrow.status == EscrowStatus.WorkSubmitted,
            "Cannot dispute at this stage"
        );
        
        escrow.status = EscrowStatus.Disputed;
        escrow.lastUpdated = block.timestamp;
        
        emit DisputeRaised(_escrowId, msg.sender);
    }
    
    function resolveDispute(
        uint256 _escrowId,
        uint256 _clientAmount,
        uint256 _freelancerAmount
    ) external validEscrow(_escrowId) onlyMediator(_escrowId) nonReentrant {
        EscrowContract storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Disputed, "Escrow not disputed");
        require(_clientAmount + _freelancerAmount == escrow.amount, "Amounts must sum to total");
        
        escrow.status = EscrowStatus.Completed;
        escrow.lastUpdated = block.timestamp;
        
        // Transfer resolved amounts
        if (_freelancerAmount > 0) {
            _transferFunds(escrow.freelancer, _freelancerAmount, escrow.token);
        }
        
        if (_clientAmount > 0) {
            _transferFunds(escrow.client, _clientAmount, escrow.token);
        }
        
        address winner = _freelancerAmount > _clientAmount ? escrow.freelancer : escrow.client;
        emit DisputeResolved(_escrowId, winner, _clientAmount, _freelancerAmount);
    }
    
    function cancelEscrow(uint256 _escrowId) 
        external 
        validEscrow(_escrowId) 
        onlyClient(_escrowId) 
        nonReentrant 
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Created, "Cannot cancel funded escrow");
        
        escrow.status = EscrowStatus.Cancelled;
        escrow.lastUpdated = block.timestamp;
        
        emit EscrowCancelled(_escrowId);
    }
    
    function _releasePayment(uint256 _escrowId) private {
        EscrowContract storage escrow = escrows[_escrowId];
        
        uint256 fee = (escrow.amount * platformFee) / 10000;
        uint256 freelancerPayout = escrow.amount - fee;
        
        _transferFunds(escrow.freelancer, freelancerPayout, escrow.token);
        _transferFunds(feeRecipient, fee, escrow.token);
        
        emit EscrowCompleted(_escrowId, freelancerPayout, fee);
    }
    
    function _transferFunds(address _to, uint256 _amount, address _token) private {
        if (_token == address(0)) {
            // ETH transfer
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(_token).transfer(_to, _amount);
        }
    }
    
    // Admin functions
    function addMediator(address _mediator) external onlyOwner {
        approvedMediators[_mediator] = true;
    }
    
    function removeMediator(address _mediator) external onlyOwner {
        approvedMediators[_mediator] = false;
    }
    
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%"); // 10% max
        platformFee = _fee;
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    // View functions
    function getEscrowDetails(uint256 _escrowId) 
        external 
        view 
        validEscrow(_escrowId) 
        returns (EscrowContract memory) 
    {
        return escrows[_escrowId];
    }
    
    function getClientEscrows(address _client) external view returns (uint256[] memory) {
        return clientEscrows[_client];
    }
    
    function getFreelancerEscrows(address _freelancer) external view returns (uint256[] memory) {
        return freelancerEscrows[_freelancer];
    }
}