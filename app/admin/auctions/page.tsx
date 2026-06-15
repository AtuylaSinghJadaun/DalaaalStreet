'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MonitorPlay } from 'lucide-react'

const openStage = () => {
  if (typeof window !== 'undefined') {
    window.open('/stage', 'dalaaal_stage', 'noopener')
  }
}

export default function AdminAuctions() {
  const { auctions, teams, bids, globalState } = useAppStore()
  
  const [newItemName, setNewItemName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStartingBid, setNewStartingBid] = useState('')

  const handleCreateAuction = async () => {
    if (!newItemName || !newStartingBid) return
    try {
      await supabase.from('auctions').insert({
        item_name: newItemName,
        description: newDesc,
        starting_bid: parseInt(newStartingBid),
        current_highest_bid: parseInt(newStartingBid),
        status: 'pending'
      })
      toast.success('Auction created')
      setNewItemName('')
      setNewDesc('')
      setNewStartingBid('')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleStartAuction = async (id: string) => {
    // End any currently active auction
    const active = auctions.find(a => a.status === 'active')
    if (active) {
      toast.error('Another auction is already active. End it first.')
      return
    }

    try {
      await supabase.from('auctions').update({ status: 'active' }).eq('id', id)
      toast.success('Auction started!')
      // Launch the big-screen stage view.
      openStage()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleEndAuction = async (id: string) => {
    try {
      const auction = auctions.find(a => a.id === id)
      if (!auction) return

      await supabase.from('auctions').update({ status: 'ended' }).eq('id', id)
      
      // If there's a winner, deduct money and add to inventory
      if (auction.highest_bidder_id) {
        const winner = teams.find(t => t.id === auction.highest_bidder_id)
        if (winner) {
          const newBalance = winner.cash_balance - auction.current_highest_bid
          await supabase.from('teams').update({ cash_balance: newBalance }).eq('id', winner.id)
          
          await supabase.from('inventory').insert({
            team_id: winner.id,
            item_name: auction.item_name,
            status: 'unused'
          })
          
          toast.success(`Auction ended. Won by ${winner.name}`)
        }
      } else {
        toast.success('Auction ended with no bids')
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auction Management</h1>
          <p className="text-muted-foreground mt-1">Manage live auctions. Only one auction can be active at a time.</p>
        </div>
        <Button variant="outline" onClick={openStage} className="gap-2">
          <MonitorPlay className="h-4 w-4" />
          Open Big Screen
        </Button>
      </div>

      {globalState?.current_phase !== 'auction' && (
        <div className="p-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg">
          <strong>Note:</strong> The system is currently NOT in the Auction phase. Participants won't see these until you switch the phase to 'Auction'.
        </div>
      )}

      <Card className="bg-card border-border shadow-md max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Auction Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Mentor Dinner" />
            </div>
            <div className="space-y-2">
              <Label>Starting Bid (₹)</Label>
              <Input type="number" value={newStartingBid} onChange={(e) => setNewStartingBid(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief details about the reward..." />
            </div>
          </div>
          <Button onClick={handleCreateAuction} className="w-full">Create Item</Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle>Auction List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Starting</TableHead>
                <TableHead>Current Highest</TableHead>
                <TableHead>Winner/Highest Bidder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map(auction => {
                const bidder = teams.find(t => t.id === auction.highest_bidder_id)
                return (
                  <TableRow key={auction.id} className={auction.status === 'active' ? 'bg-primary/10' : ''}>
                    <TableCell className="font-bold">{auction.item_name}</TableCell>
                    <TableCell>₹{auction.starting_bid.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-primary font-bold">₹{auction.current_highest_bid.toLocaleString()}</TableCell>
                    <TableCell>{bidder?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={auction.status === 'active' ? 'default' : auction.status === 'ended' ? 'secondary' : 'outline'}>
                        {auction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {auction.status === 'pending' && (
                        <Button size="sm" onClick={() => handleStartAuction(auction.id)}>Start</Button>
                      )}
                      {auction.status === 'active' && (
                        <Button size="sm" variant="destructive" onClick={() => handleEndAuction(auction.id)}>End & Sell</Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
