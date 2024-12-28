import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test user registration and profile creation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'register-user', [], wallet1.address)
        ]);
        
        block.receipts[0].result.expectOk();
        
        // Verify profile was created
        let profileBlock = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'get-user-profile', 
                [types.principal(wallet1.address)], 
                wallet1.address
            )
        ]);
        
        const profile = profileBlock.receipts[0].result.expectSome();
        assertEquals(profile['total-points'], types.uint(0));
        assertEquals(profile['activities-completed'], types.uint(0));
    }
});

Clarinet.test({
    name: "Test health provider registration and activity verification",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const provider = accounts.get('wallet_1')!;
        const user = accounts.get('wallet_2')!;
        
        // Register provider
        let block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'register-provider',
                [types.principal(provider.address)],
                deployer.address
            )
        ]);
        
        block.receipts[0].result.expectOk();
        
        // Register user
        block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'register-user',
                [],
                user.address
            )
        ]);
        
        // Verify activity
        block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'verify-activity',
                [
                    types.principal(user.address),
                    types.ascii("daily-exercise")
                ],
                provider.address
            )
        ]);
        
        block.receipts[0].result.expectOk();
        
        // Check updated profile
        let profileBlock = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'get-user-profile',
                [types.principal(user.address)],
                user.address
            )
        ]);
        
        const profile = profileBlock.receipts[0].result.expectSome();
        assertEquals(profile['total-points'], types.uint(10));
        assertEquals(profile['activities-completed'], types.uint(1));
    }
});

Clarinet.test({
    name: "Test token transfer between users",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const provider = accounts.get('wallet_1')!;
        const user1 = accounts.get('wallet_2')!;
        const user2 = accounts.get('wallet_3')!;
        
        // Setup: Register users and earn tokens
        let block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'register-user', [], user1.address),
            Tx.contractCall('vitality-rewards', 'register-user', [], user2.address)
        ]);
        
        // Transfer tokens
        block = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'transfer',
                [
                    types.uint(5),
                    types.principal(user1.address),
                    types.principal(user2.address)
                ],
                user1.address
            )
        ]);
        
        // Verify balances
        let balanceBlock = chain.mineBlock([
            Tx.contractCall('vitality-rewards', 'get-balance',
                [types.principal(user2.address)],
                user2.address
            )
        ]);
        
        assertEquals(balanceBlock.receipts[0].result.expectOk(), types.uint(5));
    }
});