'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ImagePlus, Loader2, LogOut, Pencil, Plus, RefreshCw, Store, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Category = { id: string; name: string }
type Size = { id?: string; size_name: string; price: number }
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number | null; image_url: string | null; has_sizes: boolean; is_available: boolean; menu_categories?: Category | Category[] | null; menu_item_sizes?: Size[] }
type FormState = { id?: string; category_id: string; name: string; description: string; price: string; image_url: string; has_sizes: boolean; sizes: Record<string, string> }

const emptyForm: FormState = { category_id: '', name: '', description: '', price: '', image_url: '', has_sizes: false, sizes: { Small: '', Medium: '', Large: '' } }
const sizeNames = ['Small', 'Medium', 'Large']

export default function MenuManagementPage() {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  const loadMenu = useCallback(async () => {
    setError(null)
    const [{ data: categoryData, error: categoryError }, { data: itemData, error: itemError }] = await Promise.all([
      supabase.from('menu_categories').select('id, name').order('name'),
      supabase.from('menu_items').select('id, category_id, name, description, price, image_url, has_sizes, is_available, menu_categories(id, name), menu_item_sizes(id, size_name, price)').order('name'),
    ])
    if (categoryError || itemError) { setError('Unable to load the menu. Check the menu tables and permissions.'); return }
    setCategories((categoryData as Category[]) ?? [])
    setItems((itemData as MenuItem[]) ?? [])
  }, [])

  useEffect(() => {
    let active = true
    async function prepare() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/sign-in'); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!active) return
      if (profileError || !profile || !['staff', 'admin'].includes(profile.role)) { setAllowed(false); setLoading(false); return }
      setAllowed(true)
      await loadMenu()
      if (active) setLoading(false)
    }
    prepare()
    return () => { active = false }
  }, [loadMenu, router])

  const groupedItems = useMemo(() => categories.map((category) => ({ category, items: items.filter((item) => item.category_id === category.id) })).filter((group) => group.items.length > 0), [categories, items])

  async function toggleAvailability(item: MenuItem) {
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_available: !item.is_available } : entry))
    const { error: updateError } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    if (updateError) { setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_available: item.is_available } : entry)); setError('Could not update availability.') }
  }

  function editItem(item: MenuItem) {
    setForm({ id: item.id, category_id: item.category_id ?? '', name: item.name, description: item.description ?? '', price: item.price?.toString() ?? '', image_url: item.image_url ?? '', has_sizes: item.has_sizes, sizes: Object.fromEntries(sizeNames.map((name) => [name, item.menu_item_sizes?.find((size) => size.size_name === name)?.price?.toString() ?? ''])) })
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, file, { upsert: false, contentType: file.type })
    if (uploadError) setError('Image upload failed.'); else { const { data } = supabase.storage.from('menu-images').getPublicUrl(path); setForm((current) => current ? { ...current, image_url: data.publicUrl } : current) }
    setUploading(false)
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!form || !form.category_id || !form.name.trim()) { setError('Name and category are required.'); return }
    setSaving(true); setError(null)
    const payload = { category_id: form.category_id, name: form.name.trim(), description: form.description.trim() || null, price: form.has_sizes ? null : Number(form.price) || 0, image_url: form.image_url || null, has_sizes: form.has_sizes }
    const result = form.id ? await supabase.from('menu_items').update(payload).eq('id', form.id).select('id, category_id, name, description, price, image_url, has_sizes, is_available, menu_categories(id, name)').single() : await supabase.from('menu_items').insert({ ...payload, is_available: true }).select('id, category_id, name, description, price, image_url, has_sizes, is_available, menu_categories(id, name)').single()
    if (result.error || !result.data) { setError('Could not save this item.'); setSaving(false); return }
    const itemId = result.data.id
    if (form.has_sizes) {
      if (form.id) await supabase.from('menu_item_sizes').delete().eq('menu_item_id', itemId)
      const sizes = sizeNames.filter((name) => form.sizes[name].trim()).map((name) => ({ menu_item_id: itemId, size_name: name, price: Number(form.sizes[name]) || 0 }))
      if (sizes.length) { const { error: sizeError } = await supabase.from('menu_item_sizes').insert(sizes); if (sizeError) { setError('Item saved, but sizes could not be saved.'); setSaving(false); return } }
    } else if (form.id) await supabase.from('menu_item_sizes').delete().eq('menu_item_id', itemId)
    await loadMenu(); setForm(null); setSaving(false)
  }

  async function deleteItem(item: MenuItem) {
    if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (deleteError) setError('Could not delete this item.'); else setItems((current) => current.filter((entry) => entry.id !== item.id))
  }

  async function signOut() { await supabase.auth.signOut(); router.replace('/sign-in') }

  if (allowed === false) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950"><div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-xl font-semibold">Access denied — staff only</h1><p className="mt-2 text-sm text-slate-500">This workspace is only available to Cravings staff and admins.</p></div></main>

  return <main className="min-h-screen bg-slate-50 text-slate-950"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white"><Store /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cravings</p><h1 className="text-xl font-semibold tracking-tight">Menu operations</h1></div></div><div className="flex items-center gap-3"><button onClick={() => router.push('/pos')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Live queue</button><button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><LogOut className="size-4" /> Sign out</button></div></div></header><div className="mx-auto max-w-[1500px] px-6 py-8"><section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-medium text-slate-500">Staff workspace</p><h2 className="text-3xl font-semibold tracking-tight">Menu management</h2><p className="mt-2 text-sm text-slate-500">Keep the customer menu accurate during service.</p></div><div className="flex gap-3"><button onClick={() => setForm({ ...emptyForm, category_id: categories[0]?.id ?? '' })} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="size-4" /> Add item</button><button onClick={loadMenu} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><RefreshCw className="size-4" /> Refresh</button></div></section>{error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Loading menu…</div> : groupedItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center"><p className="font-medium">No menu items yet</p><p className="mt-1 text-sm text-slate-500">Add your first item to start building the menu.</p></div> : <div className="flex flex-col gap-8">{groupedItems.map(({ category, items: categoryItems }) => <section key={category.id}><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{category.name}</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{categoryItems.map((item) => <article key={item.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="size-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-slate-300"><ImagePlus /></div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="font-semibold">{item.name}</h4><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || 'No description'}</p></div><button onClick={() => deleteItem(item)} aria-label={`Delete ${item.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div><p className="mt-3 text-sm font-semibold">{item.has_sizes ? 'Has sizes' : `Rs. ${Number(item.price ?? 0).toLocaleString('en-PK')}`}</p><div className="mt-3 flex items-center justify-between"><label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={item.is_available} onChange={() => toggleAvailability(item)} className="size-4 accent-slate-950" /> Available</label><button onClick={() => editItem(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="size-3.5" /> Edit</button></div></div></article>)}</div></section>)}</div>}</div>{form && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form onSubmit={saveItem} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{form.id ? 'Edit menu item' : 'Add menu item'}</h2><p className="mt-1 text-sm text-slate-500">Changes are saved directly to the menu.</p></div><button type="button" onClick={() => setForm(null)} className="text-sm text-slate-500 hover:text-slate-950">Close</button></div><div className="mt-6 grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-slate-500" /></label><label className="grid gap-1.5 text-sm font-medium">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-slate-500" /></label><label className="grid gap-1.5 text-sm font-medium">Category<select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.has_sizes} onChange={(event) => setForm({ ...form, has_sizes: event.target.checked })} className="size-4 accent-slate-950" /> This item has sizes</label>{form.has_sizes ? <div className="grid gap-3 sm:grid-cols-3">{sizeNames.map((size) => <label key={size} className="grid gap-1.5 text-sm font-medium">{size}<input type="number" min="0" value={form.sizes[size]} onChange={(event) => setForm({ ...form, sizes: { ...form.sizes, [size]: event.target.value } })} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>)}</div> : <label className="grid gap-1.5 text-sm font-medium">Price<input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>}<label className="grid gap-1.5 text-sm font-medium">Image<input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />{uploading && <span className="text-xs text-slate-500">Uploading…</span>}{form.image_url && <img src={form.image_url} alt="Selected menu item" className="mt-2 h-32 w-full rounded-xl object-cover" />}</label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">Cancel</button><button type="submit" disabled={saving || uploading} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save item'}</button></div></form></div>}</main>
}
