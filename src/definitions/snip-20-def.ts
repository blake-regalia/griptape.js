import { Context } from '../contracts';

export interface SNIP20Contract {
    getBalance: () => Record<string, unknown>
    getTokenInfo: () => Record<string, unknown>
    getTransferHistory: (page_size: number, page?: number) => Record<string, unknown>
}

export const snip20Def = {

    queries: {

        getBalance({ address, key }: Context): Record<string, unknown> {
            return { balance: { address, key } };
        },

        getTokenInfo() {
            return { token_info: {} };
        },

        getTransferHistory({ address, key }: Context, page_size: number, page?: number) {
            return { transfer_history: { address, key, page_size, page } };
        },

        getExchangeRate() {
            return { exchange_rate: {} };
        },

    },

    messages: {

        transfer({ padding }: Context, recipient: string, amount: string) {
            const handleMsg = {
                transfer: { recipient, amount, padding }
            }
            return { handleMsg };
        },

        send({ padding }: Context, recipient: string, amount: string, msg?: string) {
            const handleMsg = {
                send: { recipient, amount, msg, padding }
            }
            return { handleMsg };
        },

        registerReceive({ padding }: Context, code_hash: string) {
            const handleMsg = {
                register_receive: { code_hash, padding }
            }
            return { handleMsg }
        },

        createViewingKey({ padding }: Context, entropy: string) {
            const handleMsg = {
                create_viewing_key: { entropy, padding }
            }
            return { handleMsg }
        },

        setViewingKey({ padding }: Context, key: string) {
            const handleMsg = {
                set_viewing_key: { key, padding }
            }
            return { handleMsg }
        },

        deposit({ padding }: Context) {
            const handleMsg = {
                deposit: { padding }
            }
            return { handleMsg }
        },

        redeem({ padding }: Context, amount: string, denom?: string) {
            const handleMsg = {
                redeem: { amount, denom, padding }
            }
            return { handleMsg }
        }
    }
}