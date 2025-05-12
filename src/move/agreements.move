module SuiSign::agreements {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    
    /// Status values for agreements
    const DRAFT: u8 = 0;
    const PENDING: u8 = 1;
    const SIGNED: u8 = 2;
    
    /// Error codes
    const ENotOwner: u64 = 0;
    const ENotRecipient: u64 = 1;
    const EInvalidStatus: u64 = 2;
    const EAlreadySigned: u64 = 3;
    
    /// Represents a legal agreement that can be signed on-chain
    struct Agreement has key, store {
        id: UID,
        title: String,
        description: String,
        file_hash: String,
        creator: address,
        recipient: Option<address>,
        signed_by_creator: bool,
        signed_by_recipient: bool,
        status: u8,
        created_at: u64,
    }
    
    /// Event emitted when a new agreement is created
    struct AgreementCreated has copy, drop {
        agreement_id: ID,
        creator: address,
    }
    
    /// Event emitted when an agreement is sent to a recipient
    struct AgreementSent has copy, drop {
        agreement_id: ID,
        creator: address,
        recipient: address,
    }
    
    /// Event emitted when an agreement is signed
    struct AgreementSigned has copy, drop {
        agreement_id: ID,
        signer: address,
        is_complete: bool,
    }
    
    /// Creates a new agreement in draft status
    public entry fun create_agreement(
        title: vector<u8>,
        description: vector<u8>,
        file_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = tx_context::epoch(ctx);
        
        let agreement = Agreement {
            id: object::new(ctx),
            title: string::utf8(title),
            description: string::utf8(description),
            file_hash: string::utf8(file_hash),
            creator: sender,
            recipient: option::none(),
            signed_by_creator: false,
            signed_by_recipient: false,
            status: DRAFT,
            created_at: timestamp,
        };
        
        let agreement_id = object::id(&agreement);
        
        // Transfer the agreement to the sender
        transfer::share_object(agreement);
        
        // Emit event
        event::emit(AgreementCreated {
            agreement_id,
            creator: sender,
        });
    }
    
    /// Sends an agreement to a recipient
    public entry fun send_agreement(
        agreement: &mut Agreement,
        recipient: address,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only the creator can send the agreement
        assert!(agreement.creator == sender, ENotOwner);
        
        // Agreement must be in DRAFT status
        assert!(agreement.status == DRAFT, EInvalidStatus);
        
        // Update the agreement
        agreement.recipient = option::some(recipient);
        agreement.status = PENDING;
        
        // Auto-sign as creator when sending
        agreement.signed_by_creator = true;
        
        // Emit event
        event::emit(AgreementSent {
            agreement_id: object::id(agreement),
            creator: sender,
            recipient,
        });
    }
    
    /// Signs an agreement
    public entry fun sign_agreement(
        agreement: &mut Agreement,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Agreement must be in PENDING status
        assert!(agreement.status == PENDING, EInvalidStatus);
        
        // Determine if signer is creator or recipient
        if (sender == agreement.creator) {
            // Creator is signing
            assert!(!agreement.signed_by_creator, EAlreadySigned);
            agreement.signed_by_creator = true;
        } else {
            // Must be the recipient
            assert!(option::contains(&agreement.recipient, &sender), ENotRecipient);
            assert!(!agreement.signed_by_recipient, EAlreadySigned);
            agreement.signed_by_recipient = true;
        };
        
        // Check if both parties have signed
        let is_complete = agreement.signed_by_creator && agreement.signed_by_recipient;
        
        // Update status if complete
        if (is_complete) {
            agreement.status = SIGNED;
        };
        
        // Emit event
        event::emit(AgreementSigned {
            agreement_id: object::id(agreement),
            signer: sender,
            is_complete,
        });
    }
    
    /// Get agreement details
    public fun get_agreement_details(agreement: &Agreement): (
        String, 
        String, 
        String, 
        address, 
        Option<address>, 
        bool, 
        bool, 
        u8, 
        u64
    ) {
        (
            agreement.title,
            agreement.description,
            agreement.file_hash,
            agreement.creator,
            agreement.recipient,
            agreement.signed_by_creator,
            agreement.signed_by_recipient,
            agreement.status,
            agreement.created_at
        )
    }
}