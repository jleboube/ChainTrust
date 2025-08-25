// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ContentOwnershipRegistry is Ownable, ReentrancyGuard {
    
    struct ContentRecord {
        address owner;
        string contentHash;
        string ipfsHash;
        uint256 timestamp;
        string title;
        string description;
        bool isTransferable;
    }
    
    mapping(string => ContentRecord) private contentRegistry;
    mapping(address => string[]) private ownerContent;
    mapping(string => bool) private contentExists;
    
    event ContentRegistered(
        string indexed contentHash,
        address indexed owner,
        string ipfsHash,
        uint256 timestamp
    );
    
    event OwnershipTransferred(
        string indexed contentHash,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );
    
    modifier contentOwner(string memory _contentHash) {
        require(
            contentRegistry[_contentHash].owner == msg.sender,
            "Not the content owner"
        );
        _;
    }
    
    modifier contentNotExists(string memory _contentHash) {
        require(!contentExists[_contentHash], "Content already registered");
        _;
    }
    
    function registerContent(
        string memory _contentHash,
        string memory _ipfsHash,
        string memory _title,
        string memory _description,
        bool _isTransferable
    ) external nonReentrant contentNotExists(_contentHash) {
        require(bytes(_contentHash).length > 0, "Content hash required");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        
        ContentRecord memory newRecord = ContentRecord({
            owner: msg.sender,
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            title: _title,
            description: _description,
            isTransferable: _isTransferable
        });
        
        contentRegistry[_contentHash] = newRecord;
        ownerContent[msg.sender].push(_contentHash);
        contentExists[_contentHash] = true;
        
        emit ContentRegistered(_contentHash, msg.sender, _ipfsHash, block.timestamp);
    }
    
    function verifyContent(string memory _contentHash) 
        external 
        view 
        returns (
            address owner,
            string memory ipfsHash,
            uint256 timestamp,
            string memory title,
            string memory description
        ) 
    {
        require(contentExists[_contentHash], "Content not found");
        
        ContentRecord memory record = contentRegistry[_contentHash];
        return (
            record.owner,
            record.ipfsHash,
            record.timestamp,
            record.title,
            record.description
        );
    }
    
    function transferOwnership(string memory _contentHash, address _newOwner)
        external
        contentOwner(_contentHash)
        nonReentrant
    {
        require(_newOwner != address(0), "Invalid new owner address");
        require(contentRegistry[_contentHash].isTransferable, "Content not transferable");
        
        address previousOwner = contentRegistry[_contentHash].owner;
        contentRegistry[_contentHash].owner = _newOwner;
        
        // Remove from previous owner's list
        _removeContentFromOwner(previousOwner, _contentHash);
        
        // Add to new owner's list
        ownerContent[_newOwner].push(_contentHash);
        
        emit OwnershipTransferred(_contentHash, previousOwner, _newOwner, block.timestamp);
    }
    
    function getOwnerContent(address _owner) 
        external 
        view 
        returns (string[] memory) 
    {
        return ownerContent[_owner];
    }
    
    function updateContentMetadata(
        string memory _contentHash,
        string memory _title,
        string memory _description
    ) external contentOwner(_contentHash) {
        contentRegistry[_contentHash].title = _title;
        contentRegistry[_contentHash].description = _description;
    }
    
    function setTransferability(string memory _contentHash, bool _isTransferable)
        external
        contentOwner(_contentHash)
    {
        contentRegistry[_contentHash].isTransferable = _isTransferable;
    }
    
    function _removeContentFromOwner(address _owner, string memory _contentHash) private {
        string[] storage ownerList = ownerContent[_owner];
        for (uint i = 0; i < ownerList.length; i++) {
            if (keccak256(bytes(ownerList[i])) == keccak256(bytes(_contentHash))) {
                ownerList[i] = ownerList[ownerList.length - 1];
                ownerList.pop();
                break;
            }
        }
    }
}