'use client'
import { useState, useEffect, useRef } from 'react'

const FORMATS = ['pdf', 'png', 'carousel', 'linkedin', 'twitter', 'tiktok'] as const
type Format = typeof FORMATS[number]

type Brand = { id: string; name: string; primary_color: string }

export default function ContentPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState('')
  const [copy, setCopy] = useState('')
  const [formats, setFormats] = useState<Format[]>(['png'])
  const [hints, setHints] = useState('')
  const [generating, setGenerating] = useState(false)
  const [htmlLayout, setHtmlLayout] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => setBrands(Array.isArray(d) ? d : []))
  }, [])

  function toggleFormat(f: Format) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  async function generate() {
    if (!brandId) { setError('Please select a brand.'); return }
    if (!copy.trim()) { setError('Please paste your copy.'); return }
    if (formats.length === 0) { setError('Select at least one output format.'); return }
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, copy, outputFormats: formats, customHints: hints }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setHtmlLayout(data.htmlLayout)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function exportPNG() {
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const iframe = iframeRef.current
      if (!iframe?.contentDocument?.body) return
      const canvas = await html2canvas(iframe.contentDocument.body, { useCORS: true })
      const link = document.createElement('a')
      link.download = 'content.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const iframe = iframeRef.current
      if (!iframe?.contentDocument?.body) return
      const canvas = await html2canvas(iframe.contentDocument.body, { useCORS: true })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH)
      pdf.save('content.pdf')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* Left panel */}
      <div className="w-[420px] shrink-0 border-r bg-white overflow-y-auto flex flex-col">
        <div className="p-6 space-y-5 flex-1">
          {/* Brand */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Brand</label>
            <select className="border rounded-lg px-3 py-2 w-full text-sm bg-white"
              value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">Select a brand...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {brands.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No brands yet. <a href="/brands" className="text-blue-500 underline">Add one first.</a>
              </p>
            )}
          </div>

          {/* Copy */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Your Copy</label>
            <textarea className="border rounded-lg px-3 py-2 w-full text-sm h-44 resize-none"
              placeholder="Paste your finished copy here. The engine will design the layout around it."
              value={copy} onChange={e => setCopy(e.target.value)} />
          </div>

          {/* Formats */}
          <div>
            <label className="text-sm font-medium block mb-2">Output Formats</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(f => (
                <button key={f} type="button" onClick={() => toggleFormat(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    formats.includes(f)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  {f === 'twitter' ? 'Twitter/X' : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Hints */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Layout Hints
              <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
            </label>
            <input className="border rounded-lg px-3 py-2 w-full text-sm"
              placeholder='e.g. "Hero image top, 2-column, minimal white space"'
              value={hints} onChange={e => setHints(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <button onClick={generate} disabled={generating}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </span>
            ) : 'Generate Content'}
          </button>
        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0">
          <span className="text-sm font-medium text-gray-500">Preview</span>
          <div className="flex-1" />
          {htmlLayout && (
            <div className="flex gap-2">
              <button onClick={exportPNG} disabled={exporting}
                className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Export PNG
              </button>
              <button onClick={exportPDF} disabled={exporting}
                className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Export PDF
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {htmlLayout ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlLayout}
              className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-sm"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <div className="text-4xl">✦</div>
              <p className="text-sm">Your generated content will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
