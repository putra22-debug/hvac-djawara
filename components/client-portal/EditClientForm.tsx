// ============================================
// Edit Client Data Form
// Update client information with audit trail
// ============================================

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Save, 
  X, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface EditClientFormProps {
  client: any
  onSave: () => void
  onCancel: () => void
}

export function EditClientForm({ client, onSave, onCancel }: EditClientFormProps) {
  const [formData, setFormData] = useState({
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    client_type: client.client_type || 'rumah_tangga',
    pic_name: client.pic_name || '',
    pic_phone: client.pic_phone || '',
    company_npwp: client.company_npwp || '',
    company_address_npwp: client.company_address_npwp || '',
    notes_internal: client.notes_internal || '',
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed')
      return
    }

    if (file.size > maxSize) {
      setError('File size must be less than 5MB')
      return
    }

    setAvatarFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function removeAvatar() {
    if (avatarPreview && !avatarFile && client.avatar_url) {
      // Delete from storage
      const urlParts = client.avatar_url.split('/client-avatars/')
      if (urlParts.length > 1) {
        await supabase.storage.from('client-avatars').remove([urlParts[1]])
      }
    }
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return avatarPreview

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${client.id}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      let avatarUrl = avatarPreview

      // Upload avatar if changed
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          ...formData,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        onSave()
      }, 1000)
    } catch (err) {
      console.error('Error updating client:', err)
      setError(err instanceof Error ? err.message : 'Failed to update client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Client Information</CardTitle>
        <CardDescription>Update client details and contact information</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Client updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6 pb-6 border-b">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                    <Image
                      src={avatarPreview}
                      alt={client.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-gray-200">
                  <span className="text-4xl font-bold text-blue-600">
                    {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block">
                <div className="cursor-pointer">
                  <Button type="button" variant="outline" className="mb-2" onClick={() => document.getElementById('avatar-upload-edit')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                  </Button>
                  <input
                    id="avatar-upload-edit"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, or WebP • Max 5MB • Recommended 512x512px
              </p>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="text-xs text-red-600 hover:text-red-700 mt-2"
                >
                  Remove avatar
                </button>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Type *
                </label>
                <select
                  value={formData.client_type}
                  onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="rumah_tangga">Rumah Tangga</option>
                  <option value="perkantoran">Perkantoran</option>
                  <option value="komersial">Komersial</option>
                  <option value="perhotelan">Perhotelan</option>
                  <option value="sekolah_universitas">Sekolah/Universitas</option>
                  <option value="gedung_pertemuan">Gedung Pertemuan/Aula</option>
                  <option value="kantor_pemerintah">Kantor Pemerintah</option>
                  <option value="pabrik_industri">Pabrik/Industri</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          {/* Business Details (if not residential) */}
          {formData.client_type !== 'rumah_tangga' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Business Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIC Name
                  </label>
                  <Input
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIC Phone
                  </label>
                  <Input
                    value={formData.pic_phone}
                    onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NPWP
                  </label>
                  <Input
                    value={formData.company_npwp}
                    onChange={(e) => setFormData({ ...formData, company_npwp: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NPWP Address
                </label>
                <textarea
                  value={formData.company_address_npwp}
                  onChange={(e) => setFormData({ ...formData, company_address_npwp: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900">Internal Notes</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Staff Only)
              </label>
              <textarea
                value={formData.notes_internal}
                onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Internal notes not visible to client..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
