// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SubscriptionPool is Ownable, ReentrancyGuard {
    
    enum PoolStatus {
        Active,
        Paused,
        Cancelled
    }
    
    struct Pool {
        uint256 id;
        address owner;
        string serviceName;
        uint256 monthlyAmount;
        address token; // ERC20 token address (address(0) for ETH)
        uint256 maxMembers;
        uint256 currentMembers;
        PoolStatus status;
        uint256 nextPaymentDue;
        uint256 createdAt;
        mapping(address => Member) members;
        address[] memberList;
        uint256 failedPayments;
    }
    
    struct Member {
        bool isActive;
        uint256 joinedAt;
        uint256 lastPayment;
        uint256 failedPaymentCount;
        uint256 totalPaid;
    }
    
    mapping(uint256 => Pool) public pools;
    mapping(address => uint256[]) public ownerPools;
    mapping(address => uint256[]) public memberPools;
    
    uint256 public nextPoolId = 1;
    uint256 public platformFee = 200; // 2% in basis points
    address public feeRecipient;
    uint256 public constant PAYMENT_GRACE_PERIOD = 3 days;
    uint256 public constant MAX_FAILED_PAYMENTS = 2;
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed owner,
        string serviceName,
        uint256 monthlyAmount,
        uint256 maxMembers
    );
    
    event MemberJoined(uint256 indexed poolId, address indexed member);
    event MemberLeft(uint256 indexed poolId, address indexed member);
    event PaymentCollected(uint256 indexed poolId, address indexed member, uint256 amount);
    event PayoutCompleted(uint256 indexed poolId, uint256 ownerAmount, uint256 platformFee);
    event PaymentFailed(uint256 indexed poolId, address indexed member);
    event MemberRemoved(uint256 indexed poolId, address indexed member, string reason);
    event PoolStatusChanged(uint256 indexed poolId, PoolStatus newStatus);
    
    modifier onlyPoolOwner(uint256 _poolId) {
        require(pools[_poolId].owner == msg.sender, "Only pool owner can call this");
        _;
    }
    
    modifier validPool(uint256 _poolId) {
        require(_poolId < nextPoolId, "Pool does not exist");
        _;
    }
    
    modifier poolActive(uint256 _poolId) {
        require(pools[_poolId].status == PoolStatus.Active, "Pool not active");
        _;
    }
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    function createPool(
        string memory _serviceName,
        uint256 _monthlyAmount,
        address _token,
        uint256 _maxMembers
    ) external returns (uint256) {
        require(bytes(_serviceName).length > 0, "Service name required");
        require(_monthlyAmount > 0, "Monthly amount must be greater than 0");
        require(_maxMembers >= 2 && _maxMembers <= 20, "Max members must be between 2-20");
        
        uint256 poolId = nextPoolId++;
        Pool storage newPool = pools[poolId];
        
        newPool.id = poolId;
        newPool.owner = msg.sender;
        newPool.serviceName = _serviceName;
        newPool.monthlyAmount = _monthlyAmount;
        newPool.token = _token;
        newPool.maxMembers = _maxMembers;
        newPool.currentMembers = 0;
        newPool.status = PoolStatus.Active;
        newPool.nextPaymentDue = block.timestamp + 30 days;
        newPool.createdAt = block.timestamp;
        
        ownerPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, _serviceName, _monthlyAmount, _maxMembers);
        
        return poolId;
    }
    
    function joinPool(uint256 _poolId) 
        external 
        payable 
        validPool(_poolId) 
        poolActive(_poolId) 
        nonReentrant 
    {
        Pool storage pool = pools[_poolId];
        require(pool.currentMembers < pool.maxMembers, "Pool is full");
        require(!pool.members[msg.sender].isActive, "Already a member");
        require(msg.sender != pool.owner, "Owner cannot join their own pool");
        
        uint256 memberShare = pool.monthlyAmount / pool.maxMembers;
        
        // Collect first payment
        if (pool.token == address(0)) {
            require(msg.value == memberShare, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Do not send ETH for token payments");
            IERC20(pool.token).transferFrom(msg.sender, address(this), memberShare);
        }
        
        // Add member
        pool.members[msg.sender] = Member({
            isActive: true,
            joinedAt: block.timestamp,
            lastPayment: block.timestamp,
            failedPaymentCount: 0,
            totalPaid: memberShare
        });
        
        pool.memberList.push(msg.sender);
        pool.currentMembers++;
        memberPools[msg.sender].push(_poolId);
        
        emit MemberJoined(_poolId, msg.sender);
        emit PaymentCollected(_poolId, msg.sender, memberShare);
        
        // Check if pool is ready for payout
        _checkAndProcessPayout(_poolId);
    }
    
    function leavePool(uint256 _poolId) 
        external 
        validPool(_poolId) 
        nonReentrant 
    {
        Pool storage pool = pools[_poolId];
        require(pool.members[msg.sender].isActive, "Not a member of this pool");
        
        _removeMember(_poolId, msg.sender, "Member left voluntarily");
    }
    
    function collectPayments(uint256 _poolId) 
        external 
        validPool(_poolId) 
        poolActive(_poolId) 
        nonReentrant 
    {
        Pool storage pool = pools[_poolId];
        require(block.timestamp >= pool.nextPaymentDue, "Payment not due yet");
        
        uint256 memberShare = pool.monthlyAmount / pool.maxMembers;
        uint256 successfulPayments = 0;
        uint256 totalCollected = 0;
        
        // Try to collect from each member
        for (uint256 i = 0; i < pool.memberList.length; i++) {
            address member = pool.memberList[i];
            if (!pool.members[member].isActive) continue;
            
            if (_tryCollectPayment(_poolId, member, memberShare)) {
                successfulPayments++;
                totalCollected += memberShare;
            } else {
                pool.members[member].failedPaymentCount++;
                emit PaymentFailed(_poolId, member);
                
                // Remove member if too many failed payments
                if (pool.members[member].failedPaymentCount >= MAX_FAILED_PAYMENTS) {
                    _removeMember(_poolId, member, "Too many failed payments");
                    i--; // Adjust index since memberList changed
                }
            }
        }
        
        // Update next payment due
        pool.nextPaymentDue = block.timestamp + 30 days;
        
        // Process payout if we have payments
        if (totalCollected > 0) {
            _processPayout(_poolId, totalCollected);
        }
    }
    
    function _tryCollectPayment(uint256 _poolId, address _member, uint256 _amount) 
        private 
        returns (bool success) 
    {
        Pool storage pool = pools[_poolId];
        
        try this.collectFromMember(_poolId, _member, _amount) {
            pool.members[_member].lastPayment = block.timestamp;
            pool.members[_member].totalPaid += _amount;
            pool.members[_member].failedPaymentCount = 0; // Reset failed count on success
            
            emit PaymentCollected(_poolId, _member, _amount);
            return true;
        } catch {
            return false;
        }
    }
    
    function collectFromMember(uint256 _poolId, address _member, uint256 _amount) 
        external 
    {
        require(msg.sender == address(this), "Internal function");
        Pool storage pool = pools[_poolId];
        
        if (pool.token == address(0)) {
            // For ETH, member needs to approve this contract first
            revert("ETH collection requires manual payment");
        } else {
            IERC20(pool.token).transferFrom(_member, address(this), _amount);
        }
    }
    
    function manualPayment(uint256 _poolId) 
        external 
        payable 
        validPool(_poolId) 
        poolActive(_poolId) 
        nonReentrant 
    {
        Pool storage pool = pools[_poolId];
        require(pool.members[msg.sender].isActive, "Not a member");
        
        uint256 memberShare = pool.monthlyAmount / pool.maxMembers;
        
        if (pool.token == address(0)) {
            require(msg.value == memberShare, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Do not send ETH for token payments");
            IERC20(pool.token).transferFrom(msg.sender, address(this), memberShare);
        }
        
        pool.members[msg.sender].lastPayment = block.timestamp;
        pool.members[msg.sender].totalPaid += memberShare;
        pool.members[msg.sender].failedPaymentCount = 0;
        
        emit PaymentCollected(_poolId, msg.sender, memberShare);
        
        _checkAndProcessPayout(_poolId);
    }
    
    function _checkAndProcessPayout(uint256 _poolId) private {
        Pool storage pool = pools[_poolId];
        
        // Check if all members have paid for current period
        uint256 memberShare = pool.monthlyAmount / pool.maxMembers;
        uint256 expectedTotal = memberShare * pool.currentMembers;
        
        uint256 balance;
        if (pool.token == address(0)) {
            balance = address(this).balance;
        } else {
            balance = IERC20(pool.token).balanceOf(address(this));
        }
        
        if (balance >= expectedTotal) {
            _processPayout(_poolId, expectedTotal);
        }
    }
    
    function _processPayout(uint256 _poolId, uint256 _amount) private {
        Pool storage pool = pools[_poolId];
        
        uint256 fee = (_amount * platformFee) / 10000;
        uint256 ownerPayout = _amount - fee;
        
        if (pool.token == address(0)) {
            (bool success1, ) = pool.owner.call{value: ownerPayout}("");
            require(success1, "Owner payout failed");
            
            (bool success2, ) = feeRecipient.call{value: fee}("");
            require(success2, "Fee payout failed");
        } else {
            IERC20(pool.token).transfer(pool.owner, ownerPayout);
            IERC20(pool.token).transfer(feeRecipient, fee);
        }
        
        emit PayoutCompleted(_poolId, ownerPayout, fee);
    }
    
    function _removeMember(uint256 _poolId, address _member, string memory _reason) private {
        Pool storage pool = pools[_poolId];
        
        pool.members[_member].isActive = false;
        pool.currentMembers--;
        
        // Remove from memberList
        for (uint256 i = 0; i < pool.memberList.length; i++) {
            if (pool.memberList[i] == _member) {
                pool.memberList[i] = pool.memberList[pool.memberList.length - 1];
                pool.memberList.pop();
                break;
            }
        }
        
        // Remove from user's member pools
        uint256[] storage userPools = memberPools[_member];
        for (uint256 i = 0; i < userPools.length; i++) {
            if (userPools[i] == _poolId) {
                userPools[i] = userPools[userPools.length - 1];
                userPools.pop();
                break;
            }
        }
        
        emit MemberRemoved(_poolId, _member, _reason);
        emit MemberLeft(_poolId, _member);
    }
    
    function pausePool(uint256 _poolId) external validPool(_poolId) onlyPoolOwner(_poolId) {
        pools[_poolId].status = PoolStatus.Paused;
        emit PoolStatusChanged(_poolId, PoolStatus.Paused);
    }
    
    function resumePool(uint256 _poolId) external validPool(_poolId) onlyPoolOwner(_poolId) {
        pools[_poolId].status = PoolStatus.Active;
        emit PoolStatusChanged(_poolId, PoolStatus.Active);
    }
    
    function cancelPool(uint256 _poolId) external validPool(_poolId) onlyPoolOwner(_poolId) {
        pools[_poolId].status = PoolStatus.Cancelled;
        emit PoolStatusChanged(_poolId, PoolStatus.Cancelled);
    }
    
    // Admin functions
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee cannot exceed 5%");
        platformFee = _fee;
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    // View functions
    function getPoolDetails(uint256 _poolId) 
        external 
        view 
        validPool(_poolId) 
        returns (
            uint256 id,
            address owner,
            string memory serviceName,
            uint256 monthlyAmount,
            address token,
            uint256 maxMembers,
            uint256 currentMembers,
            PoolStatus status,
            uint256 nextPaymentDue
        ) 
    {
        Pool storage pool = pools[_poolId];
        return (
            pool.id,
            pool.owner,
            pool.serviceName,
            pool.monthlyAmount,
            pool.token,
            pool.maxMembers,
            pool.currentMembers,
            pool.status,
            pool.nextPaymentDue
        );
    }
    
    function getPoolMembers(uint256 _poolId) external view validPool(_poolId) returns (address[] memory) {
        return pools[_poolId].memberList;
    }
    
    function getMemberDetails(uint256 _poolId, address _member) 
        external 
        view 
        validPool(_poolId) 
        returns (Member memory) 
    {
        return pools[_poolId].members[_member];
    }
    
    function getOwnerPools(address _owner) external view returns (uint256[] memory) {
        return ownerPools[_owner];
    }
    
    function getMemberPools(address _member) external view returns (uint256[] memory) {
        return memberPools[_member];
    }
}