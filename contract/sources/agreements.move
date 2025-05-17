module contract::agreements {

    // Import necessary types directly
    // UID and TxContext can be used as sui::object::UID and sui::tx_context::TxContext
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::clock::Clock;
    use sui::balance::Balance;
    use sui::event; // For event::emit

    // vector functions are implicitly available from std::vector

    /// Agreement status
    public enum Status has copy, drop, store {
        Draft,
        Pending,
        Signed,
        Expired,
        Rejected,
    }

    /// Signature area for a signer
    public struct SignerArea has copy, drop, store {
        signer: address,
        page: u64,
        x: u64,
        y: u64,
        width: u64,
        height: u64,
        input_type: u8, // 0 = text, 1 = image
        value: vector<u8>, // signature hash or value
        signed: bool,
        rejected: bool,
    }

    /// Agreement object
    public struct Agreement has key, store {
        id: UID,
        creator: address,
        title: vector<u8>,
        description: vector<u8>,
        file_hash: vector<u8>,
        file_url: vector<u8>,
        signer_areas: vector<SignerArea>,
        status: Status,
        created_at: u64,
        is_public: bool,
        fee_paid: bool,
        expires_at: u64,
    }

    /// Treasury for collecting fees
    public struct Treasury has key, store {
        id: UID,
        admin: address,
        fee: u64, // in MIST
        balance: Balance<SUI>,
    }

    /// Event definitions
    public struct AgreementEvent has copy, drop, store {
        agreement_id: address,
        action: u8, // 0=create, 1=sent, 2=signed, 3=rejected, 4=expired, 5=fee_paid
        actor: address,
        timestamp: u64,
    }
    public struct AdminEvent has copy, drop, store {
        action: u8, // 0=withdraw, 1=fee_update
        admin: address,
        value: u64,
        timestamp: u64,
    }

    /// Create treasury (call once at deployment)
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

    /// Create a draft agreement (max 3 per sender enforced off-chain)
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
            };
            vector::push_back(&mut signer_areas, area);
            i = i + 1;
        }; // Ensure while loop is a statement
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
            fee_paid: false,
            expires_at,
        };
        sui::transfer::public_share_object(agreement);
    }

    /// Send agreement (move to Pending)
    public entry fun send_agreement(
        agreement: &mut Agreement,
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Draft, 0);
        agreement.status = Status::Pending;
        emit_agreement_event(agreement.creator, 1, sui::tx_context::sender(ctx), sui::clock::timestamp_ms(clock)); // Use clock
    }

    /// Pay fee (sender or any signer)
    public entry fun pay_fee(
        agreement: &mut Agreement,
        treasury: &mut Treasury,
        mut fee_coin: Coin<SUI>, // Make mutable to be modified by sui::coin::split
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(!agreement.fee_paid, 1);
        let required = treasury.fee;
        let paid = sui::coin::value(&fee_coin);
        assert!(paid >= required, 2);

        let to_treasury_coin = sui::coin::split(&mut fee_coin, required, ctx);
        sui::balance::join(&mut treasury.balance, sui::coin::into_balance(to_treasury_coin));
        agreement.fee_paid = true;
        emit_agreement_event(agreement.creator, 5, sui::tx_context::sender(ctx), sui::clock::timestamp_ms(clock)); // Use clock

        // The remainder in fee_coin is the refund
        if (sui::coin::value(&fee_coin) > 0) { // Added parentheses
            sui::transfer::public_transfer(fee_coin, sui::tx_context::sender(ctx));
        } else {
            sui::coin::destroy_zero(fee_coin);
        }
    }

    /// Sign a signature area (only assigned signer, after fee paid)
    public entry fun sign_area(
        agreement: &mut Agreement,
        area_idx: u64,
        signature_hash: vector<u8>,
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        assert!(agreement.fee_paid, 2);
        let signer = sui::tx_context::sender(ctx);
        let area = &mut agreement.signer_areas[area_idx];
        assert!(area.signer == signer, 3);
        assert!(!area.signed && !area.rejected, 4);
        area.value = signature_hash;
        area.signed = true;
        emit_agreement_event(agreement.creator, 2, signer, sui::clock::timestamp_ms(clock)); // Use clock
        if (all_signed(&agreement.signer_areas)) { // Corrected: added parentheses
            agreement.status = Status::Signed;
        }
    }

    /// Reject agreement (signer)
    public entry fun reject_agreement(
        agreement: &mut Agreement,
        area_idx: u64,
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        let signer = sui::tx_context::sender(ctx);
        let area = &mut agreement.signer_areas[area_idx];
        assert!(area.signer == signer, 2);
        assert!(!area.signed && !area.rejected, 3);
        area.rejected = true;
        agreement.status = Status::Rejected;
        emit_agreement_event(agreement.creator, 3, signer, sui::clock::timestamp_ms(clock)); // Use clock
    }

    /// Expire agreement (anyone, after expires_at)
    public entry fun expire_agreement(
        agreement: &mut Agreement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(&agreement.status == &Status::Pending, 1);
        assert!(sui::clock::timestamp_ms(clock) >= agreement.expires_at, 2);
        agreement.status = Status::Expired;
        emit_agreement_event(agreement.creator, 4, sui::tx_context::sender(ctx), sui::clock::timestamp_ms(clock));
    }

    /// Admin: withdraw SUI from treasury
    public entry fun withdraw(
        treasury: &mut Treasury,
        amount: u64,
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == treasury.admin, 1);
        let coin_balance = sui::balance::split(&mut treasury.balance, amount); // Returns Balance<SUI>
        let coin_to_withdraw = sui::coin::from_balance(coin_balance, ctx); // Convert Balance to Coin
        sui::transfer::public_transfer(coin_to_withdraw, treasury.admin);
        emit_admin_event(0, treasury.admin, amount, sui::clock::timestamp_ms(clock)); // Use clock
    }

    /// Admin: update fee
    public entry fun update_fee(
        treasury: &mut Treasury,
        new_fee: u64,
        clock: &Clock, // Added clock
        ctx: &mut TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == treasury.admin, 1);
        treasury.fee = new_fee;
        emit_admin_event(1, treasury.admin, new_fee, sui::clock::timestamp_ms(clock)); // Use clock
    }

    fun all_signed(areas: &vector<SignerArea>): bool {
        let n = vector::length(areas);
        let mut i = 0u64;
        while (i < n) {
            let area = vector::borrow(areas, i);
            if (!area.signed && !area.rejected) {
                return false // Early exit, no semicolon needed
            }; // Semicolon to make if-block a statement
            i = i + 1;
        }; // Semicolon to make while-block a statement
        true // Implicit return of boolean
    }

    fun emit_agreement_event(agreement_creator_address: address, action: u8, actor: address, ts: u64) {
        event::emit(AgreementEvent {
            agreement_id: agreement_creator_address,
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