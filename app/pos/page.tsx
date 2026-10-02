'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Clock3, Loader2, LogOut, Radio, RefreshCw, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled'
type Filter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed'

type OrderItem = {
  id: string
  item_name?: string | null
  size_name?: string | null
  unit_price?: number | null
  quantity: number
  line_total?: number | null
}

type Order = {
  id: string
  order_number?: string | number | null
  customer_name?: string | null
  customer_phone?: string | null
  phone?: string | null
  order_type?: string | null
  total?: number | null
  status: OrderStatus
  source?: string | null
  created_at: string
  order_items?: OrderItem[]
}

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']
const filters: { label: string; value: Filter }[] = [
  { label: 'All orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Completed', value: 'completed' },
]

function formatStatus(status: OrderStatus) {
  return status.replaceAll('_', ' ')
}

function formatMoney(value: number | null | undefined) {
  return `Rs. ${Number(value ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function statusClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-violet-100 text-violet-800',
    ready: 'bg-emerald-100 text-emerald-800',
    out_for_delivery: 'bg-cyan-100 text-cyan-800',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-red-100 text-red-800',
  }
  return classes[status]
}

export default function PosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  const loadOrders = useCallback(async () => {
    const { data, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, phone, order_type, total, status, source, created_at, order_items(id, item_name, size_name, unit_price, quantity, line_total)')
      .order('created_at', { ascending: false })

    if (ordersError) {
      setError('Unable to load orders. Check the orders and order_items tables.')
      return
    }
    setOrders((data as Order[]) ?? [])
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    let active = true

    async function prepare() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/sign-in')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!active) return
      if (profileError || !profile || !['staff', 'admin'].includes(profile.role)) {
        setAllowed(false)
        setLoading(false)
        return
      }

      setAllowed(true)
      await loadOrders()
      if (!active) return
      setLoading(false)
      channel = supabase
        .channel('pos-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
        .subscribe()
    }

    prepare()
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadOrders, router])

  const visibleOrders = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.status === filter), [filter, orders])
  const counts = useMemo(() => ({ pending: orders.filter((order) => order.status === 'pending').length, preparing: orders.filter((order) => order.status === 'preparing').length, ready: orders.filter((order) => order.status === 'ready').length }), [orders])

  async function updateStatus(order: Order, status: OrderStatus) {
    setUpdating(order.id)
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id)
    setUpdating(null)
    if (updateError) setError('Could not update that order status.')
    else setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/sign-in')
  }

  if (allowed === false) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950"><div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">!</div><h1 className="text-xl font-semibold">Access denied — staff only</h1><p className="mt-2 text-sm text-slate-500">This workspace is only available to Cravings staff and admins.</p></div></main>
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white"><Store /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cravings</p><h1 className="text-xl font-semibold tracking-tight">Order operations</h1></div></div>
          <div className="flex items-center gap-4"><div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Radio className="size-4 text-emerald-500" /> Live queue</div><button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><LogOut className="size-4" /> Sign out</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-8">
        <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-medium text-slate-500">Today&apos;s service</p><h2 className="text-3xl font-semibold tracking-tight">Live order queue</h2><p className="mt-2 text-sm text-slate-500">Manage incoming orders and keep the kitchen moving.</p></div><div className="flex gap-3"><div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Pending</p><p className="mt-1 text-2xl font-semibold">{counts.pending}</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Preparing</p><p className="mt-1 text-2xl font-semibold">{counts.preparing}</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Ready</p><p className="mt-1 text-2xl font-semibold">{counts.ready}</p></div></div></section>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${filter === item.value ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}</div><button onClick={loadOrders} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><RefreshCw className="size-4" /> Refresh</button></div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading order queue…</div> : visibleOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center"><Clock3 className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-medium">No orders in this view</p><p className="mt-1 text-sm text-slate-500">New orders will appear here automatically.</p></div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="hidden grid-cols-[1.1fr_1.2fr_1fr_.8fr_.8fr_1fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid"><span>Order</span><span>Customer</span><span>Items</span><span>Type</span><span>Total</span><span>Status</span><span>Next action</span></div><div className="divide-y divide-slate-100">{visibleOrders.map((order) => { const nextIndex = statusOrder.indexOf(order.status) + 1; const nextStatus = order.status === 'cancelled' || nextIndex >= statusOrder.length ? null : statusOrder[nextIndex]; return <article key={order.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_1.2fr_1fr_.8fr_.8fr_1fr_1.2fr] lg:items-center"><div><p className="font-semibold">#{order.order_number ?? order.id.slice(0, 8)}</p><p className="mt-1 text-xs text-slate-400">{formatTime(order.created_at)} · {order.source ?? 'website'}</p></div><div><p className="font-medium">{order.customer_name ?? 'Walk-in customer'}</p><p className="mt-1 text-sm text-slate-500">{order.customer_phone ?? order.phone ?? 'No phone provided'}</p></div><div className="text-sm text-slate-600">{order.order_items?.length ? <ul className="flex flex-col gap-1">{order.order_items.map((item) => <li key={item.id}>{item.quantity}× {item.item_name ?? 'Item'}{item.size_name ? ` (${item.size_name})` : ''}</li>)}</ul> : 'No item details'}</div><div className="text-sm capitalize text-slate-600">{order.order_type?.replaceAll('_', ' ') ?? '—'}</div><div className="font-semibold">{formatMoney(order.total)}</div><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(order.status)}`}>{formatStatus(order.status)}</span></div><div>{nextStatus ? <button disabled={updating === order.id} onClick={() => updateStatus(order, nextStatus)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{updating === order.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Mark {formatStatus(nextStatus)}</button> : <span className="text-sm text-slate-400">No further action</span>}</div></article> })}</div></div>}
      </div>
    </main>
  )
}
