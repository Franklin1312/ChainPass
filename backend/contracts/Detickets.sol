// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =============================================================================
//  EventTicketPlatform.sol  —  SINGLE FILE, UNDER 24 KB
//  NFT Event Ticket Resale Platform with QR Entry Validation
//
//  REQUIRED hardhat.config.ts compiler settings:
//  ──────────────────────────────────────────────
//  solidity: {
//    version: "0.8.20",
//    settings: {
//      optimizer: { enabled: true, runs: 1 },
//      viaIR: true    // enables Yul IR pipeline — deepest code-size reduction
//    }
//  }
//
//  HOW THIS STAYS UNDER 24 KB IN ONE FILE
//  ───────────────────────────────────────
//  1. Custom errors replace ALL require() strings  → ~50–100 bytes saved each
//  2. optimizer runs=1                             → minimise deployment size
//  3. viaIR=true                                   → cross-function deduplication
//  4. unchecked{} on safe arithmetic               → removes overflow checks
//  5. No external library (no DELEGATECALL overhead)
// =============================================================================

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract EventTicketPlatform is
    ERC721URIStorage,
    ERC2981,
    Ownable,
    ReentrancyGuard,
    Pausable
{
    // =========================================================================
    //  Custom Errors  (NO string messages — saves ~50-100 bytes per error)
    // =========================================================================

    error BadEventId();
    error EventInactive();
    error BadTokenId();
    error NotOwnerOfTicket();
    error AlreadyListed();
    error NotListed();
    error TicketIsUsed();
    error SoldOut();
    error WrongPayment();
    error BadBuyer();
    error NoSeat();
    error PriceCap();
    error PriceZero();
    error SelfBuy();
    error BadQRHash();
    error AlreadyUsed();
    error AlreadyInactive();
    error FeeTooHigh();
    error NoFunds();
    error TransferDenied();
    error UsedNoTransfer();
    error NotAuthorized();
    error PayFailed();
    error WithdrawFailed();
    error NameRequired();
    error SupplyZero();
    error PctTooLow();

    // =========================================================================
    //  Storage
    // =========================================================================

    uint256 private _nextTokenId;
    uint256 private _nextEventId;

    uint256 public platformFeePercent;      // basis points — 250 = 2.5%
    uint256 public constant MAX_FEE = 1000; // 10% hard cap
    uint256 public accumulatedFees;

    bool private _resaleInProgress; // unlock flag for _update() during resale

    // =========================================================================
    //  Structs
    // =========================================================================

    struct Event {
        string  name;
        string  date;
        string  venue;
        uint256 ticketPrice;
        uint256 totalSupply;
        uint256 ticketsMinted;
        uint256 maxResalePercent; // 120 = up to 20% markup on resale
        bool    isActive;
    }

    struct TicketDetails {
        uint256 eventId;
        string  seatNumber;
        uint256 originalPrice;
        address originalBuyer;
        bool    isUsed;
        bytes32 qrHash;
        uint256 transferCount;
    }

    struct Listing {
        uint256 price;
        address seller;
        bool    active;
    }

    // =========================================================================
    //  Mappings
    // =========================================================================

    mapping(uint256 => Event)         public events;
    mapping(uint256 => TicketDetails) public tickets;
    mapping(uint256 => Listing)       public listings;
    mapping(uint256 => uint256[])     private _eventTokens;

    // =========================================================================
    //  Events
    // =========================================================================

    event EventCreated(uint256 indexed eventId, string name, uint256 ticketPrice, uint256 totalSupply);
    event EventDeactivated(uint256 indexed eventId);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed buyer, bytes32 qrHash);
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event TicketSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId);
    event RevenueWithdrawn(address indexed to, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    // =========================================================================
    //  Constructor
    // =========================================================================

    constructor(uint256 initialFeeBps)
        ERC721("EventTicket", "ETIX")
        Ownable(msg.sender)
    {
        if (initialFeeBps > MAX_FEE) revert FeeTooHigh();
        platformFeePercent = initialFeeBps;
        _setDefaultRoyalty(msg.sender, 500); // 5% ERC2981 royalty
    }

    // =========================================================================
    //  Modifiers
    // =========================================================================

    modifier validEvent(uint256 id) {
        if (id == 0 || id > _nextEventId) revert BadEventId();
        _;
    }

    modifier activeEvent(uint256 id) {
        if (!events[id].isActive) revert EventInactive();
        _;
    }

    modifier validTicket(uint256 id) {
        if (_ownerOf(id) == address(0)) revert BadTokenId();
        _;
    }

    // =========================================================================
    //  1. EVENT MANAGEMENT
    // =========================================================================

    /**
     * @notice Create a new event. Only owner.
     * @param maxResalePct  e.g. 120 = holders may resell at up to 120% of original price
     */
    function createEvent(
        string calldata name,
        string calldata date,
        string calldata venue,
        uint256 ticketPrice,
        uint256 totalSupply,
        uint256 maxResalePct
    ) external onlyOwner {
        if (bytes(name).length == 0) revert NameRequired();
        if (ticketPrice == 0)        revert PriceZero();
        if (totalSupply == 0)        revert SupplyZero();
        if (maxResalePct < 100)      revert PctTooLow();

        uint256 eid = ++_nextEventId;
        events[eid] = Event({
            name:             name,
            date:             date,
            venue:            venue,
            ticketPrice:      ticketPrice,
            totalSupply:      totalSupply,
            ticketsMinted:    0,
            maxResalePercent: maxResalePct,
            isActive:         true
        });

        emit EventCreated(eid, name, ticketPrice, totalSupply);
    }

    /// @notice Stop new minting for an event. Existing tickets are unaffected.
    function deactivateEvent(uint256 eid)
        external onlyOwner validEvent(eid)
    {
        if (!events[eid].isActive) revert AlreadyInactive();
        events[eid].isActive = false;
        emit EventDeactivated(eid);
    }

    /// @notice Return full event struct.
    function getEventDetails(uint256 eid)
        external view validEvent(eid)
        returns (Event memory)
    {
        return events[eid];
    }

    // =========================================================================
    //  3. PRIMARY SALE — MINTING
    // =========================================================================

    /**
     * @notice Mint a ticket NFT to `buyer`. Only owner; msg.value == ticketPrice.
     *
     * @dev QR hash = keccak256(tokenId, buyer, timestamp, prevrandao).
     *      Unique per token. The gate scanner submits this hash on-chain to
     *      verify entry via markTicketAsUsed().
     */
    function mintTicket(
        uint256 eventId,
        string  calldata seatNumber,
        string  calldata metadataURI,
        address buyer
    )
        external payable
        onlyOwner whenNotPaused
        validEvent(eventId) activeEvent(eventId)
    {
        Event storage ev = events[eventId];

        if (ev.ticketsMinted >= ev.totalSupply) revert SoldOut();
        if (msg.value != ev.ticketPrice)         revert WrongPayment();
        if (buyer == address(0))                 revert BadBuyer();
        if (bytes(seatNumber).length == 0)       revert NoSeat();

        uint256 tokenId = ++_nextTokenId;
        unchecked { ev.ticketsMinted++; }

        bytes32 qrHash = keccak256(
            abi.encodePacked(tokenId, buyer, block.timestamp, block.prevrandao)
        );

        tickets[tokenId] = TicketDetails({
            eventId:       eventId,
            seatNumber:    seatNumber,
            originalPrice: ev.ticketPrice,
            originalBuyer: buyer,
            isUsed:        false,
            qrHash:        qrHash,
            transferCount: 0
        });

        _eventTokens[eventId].push(tokenId);
        unchecked { accumulatedFees += msg.value; }

        _safeMint(buyer, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit TicketMinted(tokenId, eventId, buyer, qrHash);
    }

    // =========================================================================
    //  4. RESALE — LISTING
    // =========================================================================

    /**
     * @notice List an owned, unused ticket for resale.
     *         Price enforced at ≤ originalPrice * maxResalePercent / 100.
     */
    function listTicketForResale(uint256 tokenId, uint256 price)
        external whenNotPaused validTicket(tokenId)
    {
        if (ownerOf(tokenId) != msg.sender) revert NotOwnerOfTicket();
        if (tickets[tokenId].isUsed)         revert TicketIsUsed();
        if (listings[tokenId].active)        revert AlreadyListed();
        if (price == 0)                      revert PriceZero();

        TicketDetails storage td = tickets[tokenId];
        uint256 cap = (td.originalPrice * events[td.eventId].maxResalePercent) / 100;
        if (price > cap) revert PriceCap();

        listings[tokenId] = Listing({ price: price, seller: msg.sender, active: true });
        emit TicketListed(tokenId, msg.sender, price);
    }

    /// @notice Cancel an active listing. Callable by seller or owner.
    function cancelListing(uint256 tokenId)
        external validTicket(tokenId)
    {
        Listing storage l = listings[tokenId];
        if (!l.active)                                          revert NotListed();
        if (l.seller != msg.sender && msg.sender != owner())    revert NotAuthorized();

        l.active = false;
        emit ListingCancelled(tokenId, l.seller);
    }

    // =========================================================================
    //  5. RESALE — PURCHASE
    // =========================================================================

    /**
     * @notice Buy a listed resale ticket. Strict CEI + nonReentrant.
     *
     * @dev _resaleInProgress unlocks _update() for the NFT transfer.
     *      It is cleared BEFORE ETH is sent, so a re-entrant seller cannot
     *      trigger a second transfer inside the ETH callback.
     */
    function buyResaleTicket(uint256 tokenId)
        external payable
        nonReentrant whenNotPaused validTicket(tokenId)
    {
        Listing storage l = listings[tokenId];

        // Checks
        if (!l.active)                  revert NotListed();
        if (msg.value != l.price)       revert WrongPayment();
        if (tickets[tokenId].isUsed)    revert TicketIsUsed();
        if (msg.sender == l.seller)     revert SelfBuy();

        // Effects
        uint256 salePrice = l.price;
        address seller    = l.seller;
        uint256 fee       = (salePrice * platformFeePercent) / 10_000;
        uint256 payout    = salePrice - fee;

        l.active = false;
        unchecked {
            tickets[tokenId].transferCount++;
            accumulatedFees += fee;
        }

        // Interactions — NFT first
        _resaleInProgress = true;
        _safeTransfer(seller, msg.sender, tokenId, "");
        _resaleInProgress = false;

        // Interactions — ETH to seller
        (bool ok, ) = payable(seller).call{value: payout}("");
        if (!ok) revert PayFailed();

        emit TicketSold(tokenId, seller, msg.sender, salePrice, fee);
    }

    // =========================================================================
    //  6. QR VALIDATION & ENTRY CONTROL
    // =========================================================================

    /**
     * @notice Returns the on-chain QR hash. Frontend encodes this as a QR image
     *         on the ticket PDF / wallet pass.
     */
    function getQRHash(uint256 tokenId)
        external view validTicket(tokenId)
        returns (bytes32)
    {
        return tickets[tokenId].qrHash;
    }

    /**
     * @notice Gate scanner calls this to validate and permanently consume a ticket.
     *         Only owner. Hash mismatch → entry denied. Auto-cancels any listing.
     *
     *         After call: isUsed=true → token frozen forever (no transfer, no resale).
     */
    function markTicketAsUsed(uint256 tokenId, bytes32 providedHash)
        external onlyOwner validTicket(tokenId)
    {
        TicketDetails storage td = tickets[tokenId];
        if (td.isUsed)                 revert AlreadyUsed();
        if (providedHash != td.qrHash) revert BadQRHash();

        if (listings[tokenId].active) {
            listings[tokenId].active = false;
            emit ListingCancelled(tokenId, listings[tokenId].seller);
        }

        td.isUsed = true;
        emit TicketUsed(tokenId, td.eventId);
    }

    // =========================================================================
    //  7. TRANSFER RESTRICTIONS
    // =========================================================================

    /**
     * @dev OZ v5 _update hook — called on every mint, transfer, burn.
     *
     *      Mint  (from == address(0)) → always allowed
     *      Used ticket                → permanently blocked
     *      Everything else            → only via buyResaleTicket() or owner
     */
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            if (tickets[tokenId].isUsed)                        revert UsedNoTransfer();
            if (!_resaleInProgress && msg.sender != owner())    revert TransferDenied();
        }
        return super._update(to, tokenId, auth);
    }

    // =========================================================================
    //  8 & 9. ADMIN
    // =========================================================================

    /// @notice Set platform resale fee in basis points (max 10%).
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE) revert FeeTooHigh();
        emit PlatformFeeUpdated(platformFeePercent, newFeeBps);
        platformFeePercent = newFeeBps;
    }

    /// @notice Withdraw all accumulated revenue to owner.
    function withdrawRevenue() external onlyOwner nonReentrant {
        uint256 amt = accumulatedFees;
        if (amt == 0) revert NoFunds();
        accumulatedFees = 0;
        (bool ok, ) = payable(owner()).call{value: amt}("");
        if (!ok) revert WithdrawFailed();
        emit RevenueWithdrawn(owner(), amt);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Update ERC2981 royalty receiver and percentage (basis points).
    function setDefaultRoyalty(address receiver, uint96 feeBps)
        external onlyOwner
    {
        _setDefaultRoyalty(receiver, feeBps);
    }

    // =========================================================================
    //  View Helpers
    // =========================================================================

    /// @notice All tokenIds minted for an event.
    function getEventTokens(uint256 eid)
        external view validEvent(eid)
        returns (uint256[] memory)
    {
        return _eventTokens[eid];
    }

    /// @notice Listing details for a token.
    function getListingDetails(uint256 tokenId)
        external view
        returns (bool active, address seller, uint256 price)
    {
        Listing storage l = listings[tokenId];
        return (l.active, l.seller, l.price);
    }

    /// @notice Maximum allowed resale price for a ticket.
    function maxResalePrice(uint256 tokenId)
        external view validTicket(tokenId)
        returns (uint256)
    {
        TicketDetails storage td = tickets[tokenId];
        return (td.originalPrice * events[td.eventId].maxResalePercent) / 100;
    }

    // =========================================================================
    //  ERC165
    // =========================================================================

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {
        unchecked { accumulatedFees += msg.value; }
    }
}
