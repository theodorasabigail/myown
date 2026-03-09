'use client'
import { useState, useEffect } from 'react'

type Brand = {
  id: string
  name: string
  primary_color: string
  tone_of_voice: string
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [form, setForm] = useState({ name: '', primary_color: '#1A2B3C', tone_of_voice: '', description: '' })
  const [narrative, setNarrative] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadBrands() }, [])

  async function loadBrands() {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        brand_narratives: narrative ? [{ content: narrative }] : [],
      }),
    })
    if (res.ok) {
      setForm({ name: '', primary_color: '#1A2B3C', tone_of_voice: '', description: '' })
      setNarrative('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await loadBrands()
    }
    setSaving(false)
  }

  async function deleteBrand(id: string) {
    if (!confirm('Delete this brand?')) return
    await fetch(`/api/brands/${id}`, { method: 'DELETE' })
    await loadBrands()
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6">Brands</h1>

      {brands.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          {brands.map(b => (
            <div key={b.id} className="bg-white border rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full border" style={{ background: b.primary_color }} />
                  <span className="font-medium text-sm">{b.name}</span>
                </div>
                <div className="text-xs text-gray-400">{b.tone_of_voice}</div>
              </div>
              <button onClick={() => deleteBrand(b.id)} className="text-gray-300 hover:text-red-400 text-xs ml-2">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-5">Add Brand</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Brand Name *</label>
              <input required className="border rounded px-3 py-2 w-full text-sm"
                placeholder="Acme Corp"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" className="border rounded h-[38px] w-12 p-1 cursor-pointer"
                  value={form.primary_color}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                <input className="border rounded px-3 py-2 flex-1 text-sm font-mono"
                  value={form.primary_color}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Tone of Voice</label>
            <input className="border rounded px-3 py-2 w-full text-sm"
              placeholder="e.g. Professional, warm, conversational"
              value={form.tone_of_voice}
              onChange={e => setForm(f => ({ ...f, tone_of_voice: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Brand Story / Narrative
              <span className="text-gray-400 font-normal ml-1">(used in every generation)</span>
            </label>
            <textarea className="border rounded px-3 py-2 w-full text-sm h-28 resize-none"
              placeholder="Describe your brand's mission, what you do, who you serve, and what makes you different..."
              value={narrative} onChange={e => setNarrative(e.target.value)} />
          </div>

          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Brand'}
          </button>
        </form>
      </div>
    </div>
  )
}
