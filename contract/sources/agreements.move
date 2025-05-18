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

    public struct UserInfo has copy, drop, store {
        address: address,
        email: vector<u8>,
    }

    public struct UserRegistry has key, store {
        id: UID,
        registered_users: vector<UserInfo>,
    }

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
    }

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

    public entry fun init_user_registry(ctx: &mut TxContext) {
        let registry = UserRegistry {
            id: sui::object::new(ctx),
            registered_users: vector::empty<UserInfo>(),
        };
        sui::transfer::public_share_object(registry);
    }

    public entry fun register_user(
        registry: &mut UserRegistry,
        email: vector<u8>,
        ctx: &mut TxContext
    ) {
        let user = sui::tx_context::sender(ctx);
        if (!is_address_registered(registry, user)) {
            let user_info = UserInfo {
                address: user,
                email,
            };
            vector::push_back(&mut registry.registered_users, user_info);
        };
    }

    public fun is_address_registered(registry: &UserRegistry, user_address: address): bool {
        let length = vector::length(&registry.registered_users);
        let mut i = 0;
        while (i < length) {
            let user_info = vector::borrow(&registry.registered_users, i);
            if (user_info.address == user_address) {
                return true
            };
            i = i + 1;
        };
        false
    }

    public fun is_email_registered(registry: &UserRegistry, email: &vector<u8>): bool {
        let length = vector::length(&registry.registered_users);
        let mut i = 0;
        while (i < length) {
            let user_info = vector::borrow(&registry.registered_users, i);
            if (user_info.email == *email) {
                return true
            };
            i = i + 1;
        };
        false
    }

    public fun get_address_by_email(registry: &UserRegistry, email: &vector<u8>): address {
        let length = vector::length(&registry.registered_users);
        let mut i = 0;
        while (i < length) {
            let user_info = vector::borrow(&registry.registered_users, i);
            if (user_info.email == *email) {
                return user_info.address
            };
            i = i + 1;
        };
        @0x0
    }

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
        signer_emails: vector<vector<u8>>,
        pages: vector<u64>,
        xs: vector<u64>,
        ys: vector<u64>,
        widths: vector<u64>,
        heights: vector<u64>,
        input_types: vector<u8>,
        is_public: bool,
        expires_at: u64,
        registry: &UserRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut signer_areas = vector::empty<SignerArea>();
        let n = vector::length(&signer_addresses);
        let email_count = vector::length(&signer_emails);
        
        let creator = sui::tx_context::sender(ctx);
        let mut i = 0u64;
        
        while (i < n) {
            let mut signer_address = *vector::borrow(&signer_addresses, i);
            
            assert!(creator != signer_address, 1);
            
            if (i < email_count && !vector::is_empty(vector::borrow(&signer_emails, i))) {
                let email = vector::borrow(&signer_emails, i);
                assert!(is_email_registered(registry, email), 2);
                signer_address = get_address_by_email(registry, email);
            } else {
                assert!(is_address_registered(registry, signer_address), 3);
            };
            
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
            fee_paid: false,
            expires_at,
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
            fee_paid: false,
            expires_at,
        };
        sui::transfer::public_share_object(agreement);
    }

    public entry fun send_agreement(
        agreement: &mut Agreement,
        registry: &UserRegistry,
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
            
            assert!(is_address_registered(registry, area.signer), 3);
            
            i = i + 1;
        };
        
        agreement.status = Status::Pending;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 1, sender, sui::clock::timestamp_ms(clock));
    }

    public entry fun pay_fee(
        agreement: &mut Agreement,
        treasury: &mut Treasury,
        mut fee_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!agreement.fee_paid, 1);
        let required = treasury.fee;
        let paid = sui::coin::value(&fee_coin);
        assert!(paid >= required, 2);

        let to_treasury_coin = sui::coin::split(&mut fee_coin, required, ctx);
        sui::balance::join(&mut treasury.balance, sui::coin::into_balance(to_treasury_coin));
        agreement.fee_paid = true;
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 5, sui::tx_context::sender(ctx), sui::clock::timestamp_ms(clock));

        if (sui::coin::value(&fee_coin) > 0) {
            sui::transfer::public_transfer(fee_coin, sui::tx_context::sender(ctx));
        } else {
            sui::coin::destroy_zero(fee_coin);
        }
    }

    public entry fun sign_area(
        agreement: &mut Agreement,
        area_idx: u64,
        signature_hash: vector<u8>,
        clock: &Clock,
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
        emit_agreement_event(sui::object::uid_to_address(&agreement.id), 2, signer, sui::clock::timestamp_ms(clock));
        if (all_signed(&agreement.signer_areas)) {
            agreement.status = Status::Signed;
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