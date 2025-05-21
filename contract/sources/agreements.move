module contract::agreements {

    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::clock::Clock;
    use sui::balance::Balance;
    use sui::event;

    public enum Status has copy, drop, store {
        Draft,
        Pending,
        Signed,
        Expired,
        Rejected,
    }

    // UserRegistry related structs removed as we're sending agreements directly to addresses

    public struct SignerArea has copy, drop, store {
        signer: address,
        page: u64,
        x: u64,
        y: u64,
        width: u64,
        height: u64,
        input_type: u8,
        value: vector<u8>,
        signed: bool,
        rejected: bool,
        fee_paid: bool,
        signature_blob_id: vector<u8>, // Walrus blob ID for this signer's version
    }

    public struct Agreement has key, store {
        id: UID,
        creator: address,
        title: vector<u8>,
        description: vector<u8>,
        file_hash: vector<u8>,
        file_url: vector<u8>, // Original document's Walrus blob ID
        signer_areas: vector<SignerArea>,
        status: Status,
        created_at: u64,
        is_public: bool,
        expires_at: u64,
        final_blob_id: vector<u8>, // Final signed document's Walrus blob ID (when all have signed)
    }

    public struct Treasury has key, store {
        id: UID,
        admin: address,
        fee: u64,
        balance: Balance<SUI>,
    }

    public struct AgreementEvent has copy, drop, store {
        agreement_id: address,
        action: u8,
        actor: address,
        timestamp: u64,
    }
    public struct AdminEvent has copy, drop, store {
        action: u8,
        admin: address,
        value: u64,
        timestamp: u64,
    }

    // UserRegistry related functions removed as we're sending agreements directly to addresses

    public entry fun create_treasury(admin: address, fee: u64, coin_in: Coin<SUI>, ctx: &mut TxContext) {
        let mut new_balance = sui::balance::zero<SUI>();
        sui::balance::join(&mut new_balance, sui::coin::into_balance(coin_in));
        let treasury = Treasury {
            id: sui::object::new(ctx),
            admin,
            fee,
            balance: new_balance,
        };
        sui::transfer::public_share_object(treasury);
    }

    public entry fun create_agreement(
        title: vector<u8>,
        description: vector<u8>,
        file_hash: vector<u8>,
        file_url: vector<u8>,
        signer_addresses: vector<address>,
        pages: vector<u64>,
        xs: vector<u64>,
        ys: vector<u64>,
        widths: vector<u64>,
        heights: vector<u64>,
        input_types: vector<u8>,
        is_public: bool,
        expires_at: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut signer_areas = vector::empty<SignerArea>();
        let n = vector::length(&signer_addresses);
        
        let creator = sui::tx_context::sender(ctx);
        let mut i = 0u64;
        
        while (i < n) {
            let signer_address = *vector::borrow(&signer_addresses, i);
            
            assert!(creator != signer_address, 1);
            
            let area = SignerArea {
                signer: signer_address,
                page: *vector::borrow(&pages, i),
                x: *vector::borrow(&xs, i),
                y: *vector::borrow(&ys, i),
                width: *vector::borrow(&widths, i),
                height: *vector::borrow(&heights, i),
                input_type: *vector::borrow(&input_types, i),
                value: vector::empty<u8>(),
                signed: false,
                rejected: false,
                fee_paid: false,
                signature_blob_id: vector::empty<u8>(),
            };
            vector::push_back(&mut signer_areas, area);
            i = i + 1;
        };
        
        let agreement = Agreement {
            id: sui::object::new(ctx),
            creator,
            title,
            description,
            file_hash,
            file_url,
            signer_areas,
            status: Status::Pending,
            created_at: sui::clock::timestamp_ms(clock),
            is_public,
            expires_at,
            final_blob_id: vector::empty<u8>(),
        };
        
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 1, creator, sui::clock::timestamp_ms(clock));
        
        sui::transfer::public_share_object(agreement);
    }

    public entry fun create_draft(
        title: vector<u8>,
        description: vector<u8>,
        file_hash: vector<u8>,
        file_url: vector<u8>,
        signer_addresses: vector<address>,
        pages: vector<u64>,
        xs: vector<u64>,
        ys: vector<u64>,
        widths: vector<u64>,
        heights: vector<u64>,
        input_types: vector<u8>,
        is_public: bool,
        expires_at: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut signer_areas = vector::empty<SignerArea>();
        let n = vector::length(&signer_addresses);
        let mut i = 0u64;
        while (i < n) {
            let area = SignerArea {
                signer: *vector::borrow(&signer_addresses, i),
                page: *vector::borrow(&pages, i),
                x: *vector::borrow(&xs, i),
                y: *vector::borrow(&ys, i),
                width: *vector::borrow(&widths, i),
                height: *vector::borrow(&heights, i),
                input_type: *vector::borrow(&input_types, i),
                value: vector::empty<u8>(),
                signed: false,
                rejected: false,
                fee_paid: false,
                signature_blob_id: vector::empty<u8>(),
            };
            vector::push_back(&mut signer_areas, area);
            i = i + 1;
        };
        let agreement = Agreement {
            id: sui::object::new(ctx),
            creator: sui::tx_context::sender(ctx),
            title,
            description,
            file_hash,
            file_url,
            signer_areas,
            status: Status::Draft,
            created_at: sui::clock::timestamp_ms(clock),
            is_public,
            expires_at,
            final_blob_id: vector::empty<u8>(),
        };
        sui::transfer::public_share_object(agreement);
    }

    public entry fun send_agreement(
        agreement: &mut Agreement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {    
        let sender = sui::tx_context::sender(ctx);
        assert!(sender == agreement.creator, 1);
        
        let mut i = 0;
        let signer_count = vector::length(&agreement.signer_areas);
        while (i < signer_count) {
            let area = vector::borrow(&agreement.signer_areas, i);
            assert!(area.signer != sender, 2);
            
            i = i + 1;
        };
        
        agreement.status = Status::Pending;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 1, sender, sui::clock::timestamp_ms(clock));
    }

    public entry fun pay_fee(
        agreement: &mut Agreement,
        area_idx: u64,
        treasury: &mut Treasury,
        mut fee_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let signer = sui::tx_context::sender(ctx);
        let area = &mut agreement.signer_areas[area_idx];
        
        assert!(area.signer == signer, 1);
        assert!(!area.fee_paid, 2);
        
        let required = treasury.fee;
        let paid = sui::coin::value(&fee_coin);
        assert!(paid >= required, 3);

        let to_treasury_coin = sui::coin::split(&mut fee_coin, required, ctx);
        sui::balance::join(&mut treasury.balance, sui::coin::into_balance(to_treasury_coin));
        
        area.fee_paid = true;
        
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 5, signer, sui::clock::timestamp_ms(clock));

        if (sui::coin::value(&fee_coin) > 0) {
            sui::transfer::public_transfer(fee_coin, signer);
        } else {
            sui::coin::destroy_zero(fee_coin);
        }
    }

    public entry fun sign_area(
        agreement: &mut Agreement,
        area_idx: u64,
        signature_hash: vector<u8>,
        signature_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        let signer = sui::tx_context::sender(ctx);
        let area = &mut agreement.signer_areas[area_idx];
        assert!(area.signer == signer, 2);
        assert!(area.fee_paid, 3);
        assert!(!area.signed && !area.rejected, 4);
        area.value = signature_hash;
        area.signature_blob_id = signature_blob_id;
        area.signed = true;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 2, signer, sui::clock::timestamp_ms(clock));
        if (all_signed(&agreement.signer_areas)) {
            agreement.status = Status::Signed;
            // The last signer's document becomes the final version
            agreement.final_blob_id = signature_blob_id;
            emit_agreement_event(sui::object::uid_to_address(&agreement.id), 7, signer, sui::clock::timestamp_ms(clock));
        }
    }

    public entry fun reject_agreement(
        agreement: &mut Agreement,
        area_idx: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        let signer = sui::tx_context::sender(ctx);
        let area = &mut agreement.signer_areas[area_idx];
        assert!(area.signer == signer, 2);
        assert!(!area.signed && !area.rejected, 3);
        area.rejected = true;
        agreement.status = Status::Rejected;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 3, signer, sui::clock::timestamp_ms(clock));
    }

    public entry fun set_final_blob_id(
        agreement: &mut Agreement,
        final_blob_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(sender == agreement.creator, 1);
        assert!(&agreement.status == &Status::Signed, 2);
        assert!(vector::is_empty(&agreement.final_blob_id), 3);
        
        agreement.final_blob_id = final_blob_id;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 7, sender, sui::clock::timestamp_ms(clock));
    }

    public entry fun expire_agreement(
        agreement: &mut Agreement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        assert!(sui::clock::timestamp_ms(clock) >= agreement.expires_at, 2);
        agreement.status = Status::Expired;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 4, sui::tx_context::sender(ctx), sui::clock::timestamp_ms(clock));
    }

    public entry fun withdraw(
        treasury: &mut Treasury,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == treasury.admin, 1);
        let coin_balance = sui::balance::split(&mut treasury.balance, amount);
        let coin_to_withdraw = sui::coin::from_balance(coin_balance, ctx);
        sui::transfer::public_transfer(coin_to_withdraw, treasury.admin);
        emit_admin_event(0, treasury.admin, amount, sui::clock::timestamp_ms(clock));
    }

    public entry fun update_fee(
        treasury: &mut Treasury,
        new_fee: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == treasury.admin, 1);
        treasury.fee = new_fee;
        emit_admin_event(1, treasury.admin, new_fee, sui::clock::timestamp_ms(clock));
    }

    public entry fun delete_draft_agreement(
        agreement: Agreement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(sender == agreement.creator, 1);
        assert!(&agreement.status == &Status::Draft, 2);

        let Agreement { 
            id,
            creator: _,
            title: _,
            description: _,
            file_hash: _,
            file_url: _,
            signer_areas: _,
            status: _,
            created_at: _,
            is_public: _,
            expires_at: _,
            final_blob_id: _,
        } = agreement;

        emit_agreement_event(sui::object::uid_to_address(&id), 6, sender, sui::clock::timestamp_ms(clock));
        sui::object::delete(id);
    }

    fun all_signed(areas: &vector<SignerArea>): bool {
        let n = vector::length(areas);
        let mut i = 0u64;
        while (i < n) {
            let area = vector::borrow(areas, i);
            if (!area.signed && !area.rejected) {
                return false
            };
            i = i + 1;
        };
        true
    }

    fun emit_agreement_event(agreement_id: address, action: u8, actor: address, ts: u64) {
        event::emit(AgreementEvent {
            agreement_id,
            action,
            actor,
            timestamp: ts,
        });
    }

    fun emit_admin_event(action: u8, admin: address, value: u64, ts: u64) {
        event::emit(AdminEvent {
            action,
            admin,
            value,
            timestamp: ts,
        });
    }
}