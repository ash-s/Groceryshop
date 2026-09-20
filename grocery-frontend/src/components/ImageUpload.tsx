import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { uploadApi } from '../api/upload'
import { getErrorMessage } from '../api/auth'

export default function ImageUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadApi.uploadImage(file)
      onChange(url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="uploaded"
            className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Change Image
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-gray-500 hover:border-green-500 hover:text-green-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
          <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
          <span className="text-xs text-gray-400">JPG, PNG, GIF or WebP — max 5 MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}