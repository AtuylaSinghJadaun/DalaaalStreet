import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export type GlobalPhase = 'setup' | 'waiting_for_ipo' | 'ipo' | 'round_1' | 'round_2' | 'round_3' | 'round_4' | 'round_5' | 'ended' | 'auction'

// Sentinel round_number used to store the dedicated "Endgame" price set. It is
// not a playable round — it holds the final liquidation prices used when the
// game ends. Kept out of the normal round flow (game controls, trading, etc.).
export const ENDGAME_ROUND_NUMBER = 9999

export interface GlobalState {
  current_phase: GlobalPhase
  ipo_min_spend: number
  initial_team_balance: number
}

export interface Team {
  id: string
  team_number: number
  team_code: string
  name: string
  cash_balance: number
  ipo_participant: boolean
  locked: boolean
}

export interface Company {
  id: string
  name: string
  description: string
  industry: string
  logo_url: string
  initial_valuation: number
  ipo_price: number
  available_shares: number
}

export interface Round {
  id: string
  round_number: number
  title: string
  event_description: string
  is_active: boolean
}

export interface RoundPrice {
  id: string
  round_id: string
  company_id: string
  mean_price: number
}

export interface Holding {
  id: string
  team_id: string
  company_id: string
  quantity: number
  average_purchase_price: number
}

export interface Trade {
  id: string
  sender_team_id: string
  receiver_team_id: string
  company_id: string
  quantity: number
  price: number
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  expires_at: string
}

export interface Auction {
  id: string
  item_name: string
  description: string
  starting_bid: number
  current_highest_bid: number
  highest_bidder_id: string | null
  status: 'pending' | 'active' | 'ended'
  ends_at: string | null
}

export interface Bid {
  id: string
  auction_id: string
  team_id: string
  amount: number
  created_at: string
}

export interface Inventory {
  id: string
  team_id: string
  item_name: string
  status: 'unused' | 'used'
}

interface AppStore {
  globalState: GlobalState | null
  teams: Team[]
  companies: Company[]
  rounds: Round[]
  roundPrices: RoundPrice[]
  holdings: Holding[]
  trades: Trade[]
  auctions: Auction[]
  bids: Bid[]
  inventory: Inventory[]
  isInitialized: boolean
  
  initialize: () => Promise<void>
  subscribeToRealtime: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  globalState: null,
  teams: [],
  companies: [],
  rounds: [],
  roundPrices: [],
  holdings: [],
  trades: [],
  auctions: [],
  bids: [],
  inventory: [],
  isInitialized: false,

  initialize: async () => {
    try {
      const [
        { data: globalState },
        { data: teams },
        { data: companies },
        { data: rounds },
        { data: roundPrices },
        { data: holdings },
        { data: trades },
        { data: auctions },
        { data: bids },
        { data: inventory },
      ] = await Promise.all([
        supabase.from('global_state').select('*').single(),
        supabase.from('teams').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('rounds').select('*'),
        supabase.from('round_prices').select('*'),
        supabase.from('holdings').select('*'),
        supabase.from('trades').select('*'),
        supabase.from('auctions').select('*'),
        supabase.from('bids').select('*'),
        supabase.from('inventory').select('*'),
      ])

      set({
        globalState: globalState as GlobalState,
        teams: teams as Team[] || [],
        companies: companies as Company[] || [],
        rounds: rounds as Round[] || [],
        roundPrices: roundPrices as RoundPrice[] || [],
        holdings: holdings as Holding[] || [],
        trades: trades as Trade[] || [],
        auctions: auctions as Auction[] || [],
        bids: bids as Bid[] || [],
        inventory: inventory as Inventory[] || [],
        isInitialized: true,
      })

      get().subscribeToRealtime()
    } catch (error) {
      console.error('Failed to initialize store:', error)
    }
  },

  subscribeToRealtime: () => {
    const channel = supabase.channel('schema-db-changes')
      
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_state' }, (payload) => {
        set({ globalState: payload.new as GlobalState })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        set((state) => ({
          teams: handlePayload(state.teams, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, (payload) => {
        set((state) => ({
          companies: handlePayload(state.companies, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, (payload) => {
        set((state) => ({
          rounds: handlePayload(state.rounds, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_prices' }, (payload) => {
        set((state) => ({
          roundPrices: handlePayload(state.roundPrices, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holdings' }, (payload) => {
        set((state) => ({
          holdings: handlePayload(state.holdings, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
        set((state) => ({
          trades: handlePayload(state.trades, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, (payload) => {
        set((state) => ({
          auctions: handlePayload(state.auctions, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, (payload) => {
        set((state) => ({
          bids: handlePayload(state.bids, payload)
        }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        set((state) => ({
          inventory: handlePayload(state.inventory, payload)
        }))
      })
      .subscribe()
  }
}))

function handlePayload<T extends { id: any }>(currentArray: T[], payload: any): T[] {
  if (payload.eventType === 'INSERT') {
    return [...currentArray, payload.new as T]
  }
  if (payload.eventType === 'UPDATE') {
    return currentArray.map(item => item.id === payload.new.id ? (payload.new as T) : item)
  }
  if (payload.eventType === 'DELETE') {
    return currentArray.filter(item => item.id !== payload.old.id)
  }
  return currentArray
}
